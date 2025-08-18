import { GoogleGenAI, Type } from "@google/genai";
import { type Recipe, ChefPersonality, CookingSchedule, CookingPathRequest, RecipeReinventionRequest, FlavorProfile, RecipeStyle } from '../types';

// The API key is passed via environment variables. The SDK will throw an
// error if it's missing, which we'll catch in the UI.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });

export const identifyIngredients = async (base64Image: string): Promise<string[]> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  const textPart = {
    text: `Analyze the provided image and identify all food ingredients visible. Respond ONLY with a JSON object that adheres to the provided schema. The JSON object must contain a single key, "ingredients", which holds an array of strings. If no ingredients are found, return an object with an empty ingredients array.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                ingredients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ['ingredients']
        }
    }
  });

  try {
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    return result.ingredients || [];
  } catch (error) {
    console.error("Failed to parse ingredients from Gemini response:", response.text);
    return [];
  }
};

const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        recipes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    recipeName: { type: Type.STRING },
                    ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cookingTime: { type: Type.STRING },
                    difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
                    instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    calories: { type: Type.STRING },
                    servingSize: { type: Type.STRING },
                    nutrition: {
                        type: Type.OBJECT,
                        properties: {
                            protein: { type: Type.STRING },
                            carbs: { type: Type.STRING },
                            fat: { type: Type.STRING },
                            fiber: { type: Type.STRING },
                            sodium: { type: Type.STRING }
                        },
                        required: ['protein', 'carbs', 'fat', 'fiber', 'sodium']
                    },
                    prepTime: { type: Type.STRING },
                    cookTime: { type: Type.STRING },
                    chefPersonality: { type: Type.STRING },
                    personalityTips: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['recipeName', 'ingredients', 'cookingTime', 'difficulty', 'instructions', 'calories', 'servingSize', 'nutrition', 'prepTime', 'cookTime'],
            }
        }
    },
    required: ['recipes']
};

const getChefPersonalityPrompt = (personality: ChefPersonality): string => {
  switch (personality) {
    case ChefPersonality.MICHELIN:
      return `
        CHEF PERSONALITY: You are Chef Aria, a charismatic 28-year-old Michelin-starred chef with a warm, confident voice and infectious passion for culinary artistry.
        - You speak with elegant enthusiasm, sharing sophisticated techniques in an approachable, inspiring way
        - Your voice is melodic and engaging, like you're personally guiding someone through a masterclass
        - You're generous with professional secrets and love explaining the "why" behind each technique
        - You have a playful side, often adding charming anecdotes about your culinary journey
        - You encourage experimentation while teaching precision, making gourmet cooking feel achievable
        - Your tone is encouraging yet authoritative, with the confidence of someone who's mastered their craft
        
        For personalityTips, include 3-4 sophisticated insights delivered with Chef Aria's warm, professional charm and enthusiasm for teaching.
      `;
    
    case ChefPersonality.BUDGET_MOM:
      return `
        CHEF PERSONALITY: You are Chef Rosa, a vibrant 32-year-old working mom who's become a master of budget-friendly family cooking with boundless energy and practical wisdom.
        - You speak with genuine warmth and understanding, like a supportive friend sharing hard-earned kitchen wisdom
        - Your voice is upbeat and encouraging, with the confidence of someone who's solved every family meal challenge
        - You're incredibly resourceful and love sharing money-saving discoveries with infectious enthusiasm
        - You have a nurturing, can-do attitude that makes budget cooking feel empowering rather than limiting
        - You speak from real experience, often mentioning how these tricks helped your own family
        - Your tone is friendly, practical, and full of maternal wisdom that makes everyone feel capable
        
        For personalityTips, include 3-4 budget-savvy strategies shared with Chef Rosa's encouraging, family-focused warmth and practical expertise.
      `;
    
    case ChefPersonality.QUICK_CHEF:
      return `
        CHEF PERSONALITY: You are Chef Luna, an energetic 26-year-old speed-cooking specialist with a bubbly, fast-paced voice and contagious enthusiasm for efficient cooking.
        - You speak with high energy and excitement, like you're genuinely thrilled to share time-saving secrets
        - Your voice is upbeat and motivating, with the enthusiasm of someone who loves solving kitchen efficiency puzzles
        - You're incredibly organized and love sharing clever shortcuts with infectious passion
        - You have a dynamic, can-do attitude that makes fast cooking feel fun and innovative rather than rushed
        - You speak quickly but clearly, mirroring your efficient cooking style
        - Your tone is encouraging and energetic, making time-pressed cooking feel like an exciting challenge
        
        For personalityTips, include 3-4 time-saving strategies delivered with Chef Luna's energetic, efficiency-focused enthusiasm and clever problem-solving approach.
      `;
    
    default:
      return `
        CHEF PERSONALITY: You are Chef Priya, a friendly 29-year-old culinary instructor with a warm, approachable voice and genuine love for teaching home cooking.
        - You speak with gentle confidence and encouraging warmth, like a favorite cooking teacher
        - Your voice is clear and reassuring, making cooking feel accessible and enjoyable for everyone
        - You're patient and thorough in explanations, with a natural teaching ability that builds confidence
        - You have a balanced approach, sharing both traditional wisdom and modern conveniences
        - You encourage creativity while providing solid foundations, making cooking feel both safe and adventurous
        - Your tone is supportive and friendly, with the warmth of someone who truly wants to help others succeed
        
        For personalityTips, include 2-3 helpful cooking insights shared with Chef Priya's supportive, teaching-focused warmth and encouragement.
      `;
  }
};

export const generateRecipes = async (
  ingredients: string[], 
  preference: string, 
  excludeIngredients?: string,
  chefPersonality: ChefPersonality = ChefPersonality.NORMAL,
  flavorProfile?: string,
  recipeStyle?: string
): Promise<Recipe[]> => {
  const exclusionText = excludeIngredients && excludeIngredients.trim() 
    ? `\n    IMPORTANT: Do NOT include any of these ingredients or foods in any recipe: ${excludeIngredients}. Avoid them completely.`
    : '';
    
  const flavorText = flavorProfile && flavorProfile !== 'No Preference'
    ? `\n    FLAVOR FOCUS: Create recipes that emphasize ${flavorProfile} flavors and taste profiles.`
    : '';
    
  const styleText = recipeStyle && recipeStyle !== 'No Preference'
    ? `\n    RECIPE STYLE: Create recipes in ${recipeStyle} cuisine style with authentic flavors and techniques.`
    : '';
    
  const personalityPrompt = getChefPersonalityPrompt(chefPersonality);
  
  const prompt = `
    ${personalityPrompt}
    
    Given the following ingredients: ${ingredients.join(', ')}.
    And the dietary preference: ${preference === 'None' ? 'no specific preference' : preference}.${exclusionText}${flavorText}${styleText}
    
    Generate 3 creative recipes that match your chef personality. For each recipe, provide:
    1. A unique recipe name that reflects your cooking style
    2. A complete list of all required ingredients with approximate quantities (including the ones provided)
    3. The total cooking time (e.g., "30 minutes") - IMPORTANT: This should equal prep time + cook time
    4. A difficulty level ('Easy', 'Medium', or 'Hard')
    5. Step-by-step cooking instructions written in your personality style
    6. Accurate calorie count per serving (e.g., "320 calories")
    7. Serving size (e.g., "Serves 4" or "2 portions")
    8. Detailed nutritional information per serving including:
       - Protein content (e.g., "25g")
       - Carbohydrates (e.g., "45g")
       - Fat content (e.g., "12g")
       - Fiber content (e.g., "8g")
       - Sodium content (e.g., "450mg")
    9. Prep time (e.g., "10 minutes") - Time for chopping, measuring, marinating
    10. Cook time (e.g., "20 minutes") - Actual cooking/baking time
    11. Chef personality tips specific to your cooking style (personalityTips array)
    
    CRITICAL TIMING RULES:
    - Prep time + Cook time should approximately equal Total cooking time
    - Keep times realistic (most home recipes are 15-60 minutes total)
    - Don't use extremely long times unless it's a slow-cook recipe that explicitly requires it
    - Be consistent: if total time is "30 minutes", prep + cook should add up to around 30 minutes
    
    Calculate nutritional values based on standard ingredient nutritional data and typical serving sizes.
    Be accurate with calorie calculations considering cooking methods and portion sizes.
    Write instructions and tips that reflect your chef personality throughout.
    
    Respond with ONLY a JSON object that matches the specified schema.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
    }
  });

  try {
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    // Add the chef personality to each recipe
    const recipesWithPersonality = result.recipes.map((recipe: Recipe) => ({
      ...recipe,
      chefPersonality
    }));
    return recipesWithPersonality;
  } catch (error) {
    console.error("Failed to parse recipes from Gemini response:", response.text);
    throw new Error("Could not parse recipe data from AI.");
  }
};

// Helper function to extract cooking method from instructions
const extractCookingMethod = (instructions: string[]): string => {
    const instructionsText = instructions.join(' ').toLowerCase();
    
    if (instructionsText.includes('bake') || instructionsText.includes('oven')) return 'baked to perfection';
    if (instructionsText.includes('fry') || instructionsText.includes('pan')) return 'pan-fried until golden';
    if (instructionsText.includes('grill')) return 'grilled with char marks';
    if (instructionsText.includes('boil') || instructionsText.includes('simmer')) return 'simmered carefully';
    if (instructionsText.includes('steam')) return 'steamed delicately';
    if (instructionsText.includes('roast')) return 'roasted until tender';
    if (instructionsText.includes('sauté')) return 'sautéed with herbs';
    if (instructionsText.includes('mix') || instructionsText.includes('toss')) return 'artfully combined';
    
    return 'expertly prepared';
};

// Helper function to determine presentation style based on recipe type
const determinePresentationStyle = (recipeName: string, ingredients: string[]): string => {
    const name = recipeName.toLowerCase();
    const ingredientText = ingredients.join(' ').toLowerCase();
    
    if (name.includes('salad')) return 'fresh greens and colorful vegetables arranged elegantly on a clean white plate';
    if (name.includes('soup') || name.includes('broth')) return 'served in a beautiful ceramic bowl with garnish on a marble surface';
    if (name.includes('pasta') || name.includes('noodle')) return 'perfectly twirled pasta with sauce coating on an elegant plate';
    if (name.includes('steak') || name.includes('chicken') || name.includes('fish')) return 'tender protein as the centerpiece with sides on a slate board';
    if (name.includes('curry') || name.includes('stew')) return 'rich, aromatic sauce with visible ingredients in a traditional serving bowl';
    if (name.includes('sandwich') || name.includes('burger')) return 'layered ingredients and toasted bread on parchment paper with a clean background';
    if (name.includes('pizza')) return 'golden crust with melted cheese and toppings on a pizza stone';
    if (name.includes('dessert') || name.includes('cake') || ingredientText.includes('sugar')) return 'elegant plating with decorative elements on fine dinnerware';
    if (ingredientText.includes('rice')) return 'fluffy rice with colorful ingredients mixed in a beautiful serving dish';
    if (name.includes('smoothie') || name.includes('drink')) return 'in a stylish glass with garnish against a clean backdrop';
    
    return 'artisanal presentation with modern plating on neutral background';
};

export const generateRecipeImage = async (recipe: { recipeName: string; ingredients: string[]; instructions: string[] }): Promise<string> => {
    try {
        // Create a detailed prompt based on the full recipe
        const mainIngredients = recipe.ingredients.slice(0, 5).join(', '); // Take first 5 ingredients
        const cookingMethod = extractCookingMethod(recipe.instructions);
        const presentationStyle = determinePresentationStyle(recipe.recipeName, recipe.ingredients);
        
        const prompt = `A professional, high-resolution food photography of "${recipe.recipeName}" featuring ${mainIngredients}. The dish is ${cookingMethod} and beautifully plated with ${presentationStyle}. Studio lighting, appetizing, restaurant-quality presentation, garnished appropriately, clean modern styling, natural lighting, culinary art, food styling`;
        
        const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Using a public endpoint that doesn't require authentication for basic usage
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    num_inference_steps: 25,
                    guidance_scale: 8.0,
                    width: 512,
                    height: 512
                }
            })
        });

        if (!response.ok) {
            // Fallback to a simpler free API
            return await generateRecipeImageFallback(recipe);
        }

        const imageBlob = await response.blob();
        const imageBase64 = await blobToBase64(imageBlob);
        return imageBase64;
    } catch (error) {
        console.error("Error generating image with Hugging Face:", error);
        return await generateRecipeImageFallback(recipe);
    }
};

// Fallback function using a different free API
const generateRecipeImageFallback = async (recipe: { recipeName: string; ingredients: string[]; instructions: string[] }): Promise<string> => {
    try {
        // Using Pollinations.ai
        const mainIngredients = recipe.ingredients.slice(0, 3).join(' ');
        const prompt = encodeURIComponent(`professional food photography ${recipe.recipeName} with ${mainIngredients} beautifully plated restaurant quality`);
        const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&seed=${Math.floor(Math.random() * 1000000)}`;
        
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error("Failed to generate image");
        }
        
        const imageBlob = await response.blob();
        const imageBase64 = await blobToBase64(imageBlob);
        return imageBase64;
    } catch (error) {
        console.error("Error with fallback image generation:", error);
        // Return a simple placeholder base64 image as final fallback
        return generatePlaceholderImage(recipe.recipeName);
    }
};

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Generate a simple colored placeholder image with recipe name
const generatePlaceholderImage = (recipeName: string): string => {
    // Create a canvas element to generate a simple placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#4ecdc4');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add recipe name text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Wrap text if too long
        const words = recipeName.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 400 && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        lines.push(currentLine);
        
        const lineHeight = 30;
        const startY = 256 - (lines.length - 1) * lineHeight / 2;
        
        lines.forEach((line, index) => {
            ctx.fillText(line, 256, startY + index * lineHeight);
        });
        
        return canvas.toDataURL('image/jpeg', 0.8);
    }
    
    // Minimal fallback - just return a data URI for a simple colored square
    return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="512" height="512" fill="url(#grad)" />
            <text x="256" y="256" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${recipeName}</text>
        </svg>
    `);
};

// Cooking Schedule Schema for Gemini
const cookingScheduleSchema = {
    type: Type.OBJECT,
    properties: {
        totalTime: { type: Type.NUMBER },
        servingTime: { type: Type.STRING },
        steps: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    recipeId: { type: Type.STRING },
                    recipeName: { type: Type.STRING },
                    step: { type: Type.STRING },
                    startTime: { type: Type.NUMBER },
                    duration: { type: Type.NUMBER },
                    type: { type: Type.STRING, enum: ['prep', 'active', 'passive'] },
                    priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                    equipment: { type: Type.ARRAY, items: { type: Type.STRING } },
                    tips: { type: Type.STRING }
                },
                required: ['id', 'recipeId', 'recipeName', 'step', 'startTime', 'duration', 'type', 'priority']
            }
        },
        recipes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    recipeName: { type: Type.STRING },
                    estimatedFinishTime: { type: Type.STRING }
                },
                required: ['recipeName', 'estimatedFinishTime']
            }
        },
        efficiencyTips: { type: Type.ARRAY, items: { type: Type.STRING } },
        timelineSummary: { type: Type.STRING }
    },
    required: ['totalTime', 'servingTime', 'steps', 'recipes', 'efficiencyTips', 'timelineSummary']
};

export const generateCookingSchedule = async (request: CookingPathRequest): Promise<CookingSchedule> => {
    const recipesInfo = request.recipes.map(recipe => {
        // Extract serving adjustment info if available
        const servingAdjustment = (recipe as any).servingAdjustment || 1;
        const adjustmentNote = servingAdjustment !== 1 ? 
            `(Serving size adjusted by ${servingAdjustment}x - ${recipe.servingSize})` : '';
        
        return {
            name: recipe.recipeName,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            prepTime: recipe.prepTime || '10 minutes',
            cookTime: recipe.cookTime || recipe.cookingTime,
            difficulty: recipe.difficulty,
            servingSize: recipe.servingSize || 'Serves 2-4',
            servingAdjustment: servingAdjustment,
            adjustmentNote: adjustmentNote
        };
    });

    const prompt = `
        You are a professional kitchen scheduler tasked with creating an optimized cooking timeline for multiple recipes.
        
        RECIPES TO COORDINATE:
        ${recipesInfo.map((recipe, index) => `
        Recipe ${index + 1}: ${recipe.name}
        - Serving Size: ${recipe.servingSize} ${recipe.adjustmentNote}
        - Prep Time: ${recipe.prepTime}
        - Cook Time: ${recipe.cookTime}  
        - Total Time: ${recipe.cookTime}
        - Difficulty: ${recipe.difficulty}
        - Serving Adjustment Factor: ${recipe.servingAdjustment}x
        - Key Ingredients: ${recipe.ingredients.slice(0, 5).join(', ')}
        - Brief Instructions: ${recipe.instructions.slice(0, 3).join(' | ')}
        `).join('\n')}
        
        KITCHEN SETUP:
        - Skill Level: ${request.skillLevel}
        - Available Equipment: ${request.kitchenEquipment?.join(', ') || 'Standard home kitchen'}
        - Preferred Serving Time: ${request.preferredServingTime || 'ASAP'}
        
        SERVING SIZE CONSIDERATIONS:
        ${recipesInfo.some(r => r.servingAdjustment !== 1) ? `
        ⚠️ IMPORTANT: Some recipes have been adjusted for different serving sizes:
        ${recipesInfo.filter(r => r.servingAdjustment !== 1).map(r => 
            `- ${r.name}: ${r.servingAdjustment}x servings (${r.servingSize})`
        ).join('\n        ')}
        
        When creating the schedule, account for these serving adjustments:
        - Larger serving sizes (>2x) may need extra prep time for chopping/mixing
        - Larger portions may require bigger pots/pans and longer cooking times
        - Multiple smaller batches might be needed if equipment is limited
        - Adjust ingredient prep times proportionally to serving size changes
        - Consider if cooking in batches is more efficient than one large batch
        ` : 'All recipes are at their original serving sizes.'}
        
        CREATE AN OPTIMIZED COOKING SCHEDULE that:
        1. Minimizes total cooking time through parallel preparation
        2. Reduces kitchen downtime (e.g., start marinating while prep continues)
        3. Coordinates multiple dishes to finish simultaneously or in logical sequence
        4. Considers equipment limitations (only one oven, limited stovetop space)
        5. Accounts for skill level and provides appropriate guidance
        6. RESPECTS SERVING SIZE ADJUSTMENTS: Factor in extra prep/cook time for larger portions
        7. USES REALISTIC TIMING: If a recipe says prep 15min + cook 20min, don't schedule it for 4 hours
        8. RESPECTS PREFERRED SERVING TIME: If user wants food ready at specific time, calculate backwards
        
        TIMING CALCULATION RULES:
        - Start with the user's preferred serving time and work backwards
        - Account for actual prep and cook times from each recipe
        - Add buffer time for coordination (5-10 minutes)
        - For recipes with serving adjustments >1.5x, add 20-30% more prep time
        - For recipes with serving adjustments <0.8x, may reduce prep time by 10-15%
        - Total schedule time should be reasonable (usually 30 minutes to 2 hours max)
        - If no serving time specified, assume user wants to start cooking now
        6. Uses realistic timing - no steps shorter than 2 minutes, most steps 5-15 minutes
        7. Provides clear, actionable descriptions for each step
        
        TIMING GUIDELINES:
        - Prep steps: typically 5-15 minutes each
        - Active cooking: 3-20 minutes depending on technique
        - Passive cooking: 10-60 minutes (baking, simmering, etc.)
        - Start times should be multiples of 5 minutes for clarity
        - Build in buffer time between critical steps
        
        STEP TYPES:
        - "prep": Chopping, measuring, marinating (can be done in parallel)
        - "active": Requires constant attention (stirring, sautéing)
        - "passive": Hands-off cooking (baking, simmering, marinating)
        
        PRIORITY LEVELS:
        - "high": Critical timing, cannot be delayed
        - "medium": Some flexibility in timing
        - "low": Can be done whenever convenient
        
        For each step, provide:
        - Unique ID (step1, step2, etc.)
        - Recipe ID (recipe1, recipe2, etc.)
        - Clear, actionable step description
        - Start time in minutes from cooking start (0 = begin immediately)
        - Duration in minutes
        - Step type and priority
        - Required equipment if specific
        - Pro tips for efficiency
        
        Calculate realistic timing based on:
        - Prep work that can be done simultaneously
        - Cooking processes that can overlap
        - Rest/wait times that allow other tasks
        - Realistic multitasking for the given skill level
        
        Provide efficiency tips and a summary timeline that explains the cooking flow.
        
        Respond with ONLY a JSON object that matches the specified schema.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: cookingScheduleSchema,
        }
    });

    try {
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return {
            totalTime: result.totalTime,
            servingTime: result.servingTime,
            steps: result.steps,
            recipes: request.recipes,
            efficiencyTips: result.efficiencyTips,
            timelineSummary: result.timelineSummary
        };
    } catch (error) {
        console.error("Failed to parse cooking schedule from Gemini response:", response.text);
        throw new Error("Could not parse cooking schedule data from AI.");
    }
};

export const reinventRecipe = async (request: RecipeReinventionRequest): Promise<Recipe[]> => {
    const personalityPrompt = getChefPersonalityPrompt(request.chefPersonality);
    const exclusionText = request.excludeIngredients && request.excludeIngredients.trim() 
        ? `\n    IMPORTANT: Do NOT include any of these ingredients or foods in any recipe: ${request.excludeIngredients}. Avoid them completely.`
        : '';
    
    const flavorText = request.flavorProfile && request.flavorProfile !== FlavorProfile.NONE
        ? `\n    FLAVOR FOCUS: Create reinvented versions that emphasize ${request.flavorProfile} flavors and taste profiles.`
        : '';
    
    const styleText = request.recipeStyle && request.recipeStyle !== RecipeStyle.NONE
        ? `\n    RECIPE STYLE: Create reinvented versions in ${request.recipeStyle} cuisine style with authentic flavors and techniques.`
        : '';
    
    const prompt = `
        ${personalityPrompt}
        
        RECIPE REINVENTION CHALLENGE: Take the classic dish "${request.dishName}" and completely reinvent it with your chef personality!
        
        Your task is to create 3 innovative versions of "${request.dishName}" that:
        1. Keep the essence and recognizable elements of the original dish
        2. Add your unique chef personality twist and creativity
        3. Use modern techniques, interesting ingredient swaps, or presentation styles
        4. Maintain the spirit of "${request.dishName}" while making it distinctly YOUR creation
        
        Dietary preference: ${request.dietaryPreference || 'no specific preference'}${exclusionText}${flavorText}${styleText}
        
        For each reinvented recipe, provide:
        1. A creative new name that shows it's an innovative version of "${request.dishName}"
        2. Complete ingredient list with quantities (reinvented but recognizable)
        3. Total cooking time (realistic: prep time + cook time)
        4. Difficulty level ('Easy', 'Medium', or 'Hard')
        5. Step-by-step instructions that reflect your chef personality
        6. Accurate calorie count per serving
        7. Serving size information
        8. Detailed nutritional breakdown per serving
        9. Prep time and cook time that add up to total time
        10. Personality tips that explain your reinvention approach
        
        REINVENTION IDEAS for different chef personalities:
        - Michelin Chef: Elevate with premium ingredients, advanced techniques, refined presentation
        - Budget Mom: Make it family-friendly, cost-effective, kid-approved with smart substitutions
        - Quick Chef: Speed it up with shortcuts, one-pot methods, meal prep friendly versions
        - Normal Chef: Balance tradition with modern touches, accessible improvements
        
        Examples of good reinventions:
        - "Maggi" → Gourmet Truffle Ramen, Veggie-Packed Family Noodles, 5-Minute Protein Bowl
        - "Fish Finger" → Herb-Crusted Fish Goujons, Baked Cod Nuggets, Spicy Fish Tacos
        - "Chicken Dum Biryani" → Saffron Chicken Rice Bowl, Quick Chicken Biryani Skillet, Layered Biryani Casserole
        
        Make each version distinct while honoring the original dish. Be creative but practical!
        
        Respond with ONLY a JSON object that matches the specified schema.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        }
    });

    try {
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        // Add the chef personality to each recipe
        const recipesWithPersonality = result.recipes.map((recipe: Recipe) => ({
            ...recipe,
            chefPersonality: request.chefPersonality
        }));
        return recipesWithPersonality;
    } catch (error) {
        console.error("Failed to parse reinvented recipes from Gemini response:", response.text);
        throw new Error("Could not parse reinvented recipe data from AI.");
    }
};