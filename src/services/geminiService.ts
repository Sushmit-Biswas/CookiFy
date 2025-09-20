import { GoogleGenAI, Type } from "@google/genai";
import { type Recipe, ChefPersonality, CookingSchedule, CookingPathRequest, RecipeReinventionRequest, FlavorProfile, RecipeStyle } from '../types';

// Safely initialize the AI service only if API key is available
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

// Only initialize if we have an API key
if (apiKey && apiKey.trim() !== '') {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.warn('Failed to initialize Google GenAI:', error);
    ai = null;
  }
}

// Helper function to check if AI service is available
const isAIAvailable = (): boolean => {
  return ai !== null;
};

// Export function to check demo mode
export const isDemoMode = (): boolean => {
  return !isAIAvailable();
};

export const identifyIngredients = async (base64Image: string): Promise<string[]> => {
  if (!isAIAvailable()) {
    // Return demo ingredients for testing when API is not available
    return ['tomatoes', 'onions', 'garlic', 'olive oil', 'herbs'];
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };
    const textPart = {
      text: `Analyze the provided image and identify all food ingredients visible. Respond ONLY with a JSON object that adheres to the provided schema. The JSON object must contain a single key, "ingredients", which holds an array of strings. If no ingredients are found, return an object with an empty ingredients array.`
    };

    const response = await ai!.models.generateContent({
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

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    return result.ingredients || [];
  } catch (error) {
    console.error("Failed to identify ingredients:", error);
    // Return fallback ingredients on error
    return ['mixed vegetables', 'protein', 'seasonings'];
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

// Sample recipes for demo/fallback mode
const getSampleRecipes = (chefPersonality: ChefPersonality): Recipe[] => {
  const baseRecipes = [
    {
      recipeName: "Mediterranean Herb-Crusted Chicken",
      ingredients: [
        "4 chicken breasts (150g each)",
        "2 tbsp olive oil",
        "1 tsp dried oregano",
        "1 tsp dried thyme",
        "2 cloves garlic, minced",
        "1 lemon, juiced",
        "Salt and black pepper to taste",
        "1 cup cherry tomatoes",
        "1/2 red onion, sliced"
      ],
      cookingTime: "35 minutes",
      difficulty: "Medium" as const,
      instructions: [
        "Preheat oven to 200°C (400°F)",
        "Mix herbs, garlic, olive oil, and lemon juice in a bowl",
        "Season chicken breasts with salt and pepper",
        "Coat chicken with herb mixture and let marinate for 10 minutes",
        "Place chicken in baking dish with tomatoes and onions",
        "Bake for 25 minutes until chicken reaches 165°F internal temperature",
        "Let rest for 5 minutes before serving"
      ],
      calories: "285 calories",
      servingSize: "Serves 4",
      nutrition: {
        protein: "32g",
        carbs: "8g",
        fat: "12g",
        fiber: "2g",
        sodium: "380mg"
      },
      prepTime: "10 minutes",
      cookTime: "25 minutes",
      chefPersonality: chefPersonality,
      personalityTips: [
        "Marinating adds incredible flavor depth",
        "Use a meat thermometer for perfect doneness"
      ]
    },
    {
      recipeName: "Quick Asian Stir-Fry Bowl",
      ingredients: [
        "2 cups cooked rice",
        "200g mixed vegetables (bell peppers, broccoli, carrots)",
        "2 tbsp vegetable oil",
        "2 tbsp soy sauce",
        "1 tbsp honey",
        "1 tsp sesame oil",
        "2 cloves garlic, minced",
        "1 tsp fresh ginger, grated",
        "2 green onions, chopped",
        "1 tbsp sesame seeds"
      ],
      cookingTime: "20 minutes",
      difficulty: "Easy" as const,
      instructions: [
        "Heat vegetable oil in a large wok or skillet over high heat",
        "Add garlic and ginger, stir-fry for 30 seconds",
        "Add mixed vegetables, stir-fry for 5-6 minutes until crisp-tender",
        "Mix soy sauce, honey, and sesame oil in a small bowl",
        "Add sauce to vegetables and toss to coat",
        "Serve over rice and garnish with green onions and sesame seeds"
      ],
      calories: "245 calories",
      servingSize: "Serves 2",
      nutrition: {
        protein: "8g",
        carbs: "42g",
        fat: "6g",
        fiber: "4g",
        sodium: "620mg"
      },
      prepTime: "8 minutes",
      cookTime: "12 minutes",
      chefPersonality: chefPersonality,
      personalityTips: [
        "High heat keeps vegetables crispy",
        "Have all ingredients prepped before cooking"
      ]
    },
    {
      recipeName: "Creamy Mushroom Pasta",
      ingredients: [
        "300g pasta (penne or fettuccine)",
        "250g mixed mushrooms, sliced",
        "2 tbsp butter",
        "2 tbsp olive oil",
        "3 cloves garlic, minced",
        "1/2 cup white wine",
        "1 cup heavy cream",
        "1/2 cup grated Parmesan cheese",
        "2 tbsp fresh parsley, chopped",
        "Salt and black pepper to taste"
      ],
      cookingTime: "25 minutes",
      difficulty: "Medium" as const,
      instructions: [
        "Cook pasta according to package directions until al dente",
        "While pasta cooks, heat butter and oil in a large skillet",
        "Add mushrooms and cook until golden brown, about 8 minutes",
        "Add garlic and cook for 1 minute",
        "Pour in wine and let it reduce by half",
        "Add cream and simmer for 3-4 minutes",
        "Drain pasta and add to skillet with mushrooms",
        "Toss with Parmesan cheese and parsley",
        "Season with salt and pepper to taste"
      ],
      calories: "420 calories",
      servingSize: "Serves 4",
      nutrition: {
        protein: "14g",
        carbs: "52g",
        fat: "18g",
        fiber: "3g",
        sodium: "340mg"
      },
      prepTime: "5 minutes",
      cookTime: "20 minutes",
      chefPersonality: chefPersonality,
      personalityTips: [
        "Don't overcrowd mushrooms for better browning",
        "Save some pasta water to adjust sauce consistency"
      ]
    }
  ];

  // Customize tips based on chef personality
  return baseRecipes.map(recipe => ({
    ...recipe,
    personalityTips: getPersonalityTips(chefPersonality, recipe.recipeName)
  }));
};

const getPersonalityTips = (personality: ChefPersonality, recipeName: string): string[] => {
  switch (personality) {
    case ChefPersonality.MICHELIN:
      return [
        "Use premium ingredients for restaurant-quality results",
        "Pay attention to plating and presentation details",
        "Temperature control is crucial for perfect execution"
      ];
    case ChefPersonality.BUDGET_MOM:
      return [
        "This recipe is family-friendly and budget-conscious",
        "Substitute expensive ingredients with affordable alternatives",
        "Make extra portions for tomorrow's lunch"
      ];
    case ChefPersonality.QUICK_CHEF:
      return [
        "Prep all ingredients first for maximum efficiency",
        "Use high heat for faster cooking times",
        "One-pan methods save time on cleanup"
      ];
    default:
      return [
        "Take your time and enjoy the cooking process",
        "Taste as you go and adjust seasoning",
        "Don't be afraid to make it your own"
      ];
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
  if (!isAIAvailable()) {
    // Return sample recipes when API is not available
    console.info('Using demo recipes - API not available');
    return getSampleRecipes(chefPersonality);
  }

  try {
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
    
    const response = await ai!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: recipeSchema,
      }
    });

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    // Add the chef personality to each recipe
    const recipesWithPersonality = result.recipes.map((recipe: Recipe) => ({
      ...recipe,
      chefPersonality
    }));
    return recipesWithPersonality;
  } catch (error) {
    console.error("Failed to generate recipes:", error);
    // Fallback to sample recipes on error
    return getSampleRecipes(chefPersonality);
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

// Sample cooking schedule for demo/fallback mode
const getSampleCookingSchedule = (request: CookingPathRequest): CookingSchedule => {
  const recipes = request.recipes;
  const recipeCount = recipes.length;
  
  // Generate a realistic schedule based on the selected recipes
  const steps = recipes.flatMap((recipe, recipeIndex) => {
    const baseStartTime = recipeIndex * 15; // Stagger recipes by 15 minutes
    const prepTime = parseInt(recipe.prepTime?.match(/\d+/)?.[0] || '10');
    const cookTime = parseInt((recipe.cookTime || recipe.cookingTime)?.match(/\d+/)?.[0] || '20');
    
    return [
      {
        id: `prep-${recipeIndex}`,
        recipeId: `recipe-${recipeIndex}`,
        recipeName: recipe.recipeName,
        step: `Prepare ingredients for ${recipe.recipeName}`,
        startTime: baseStartTime,
        duration: Math.max(5, Math.min(prepTime, 15)), // 5-15 minutes prep
        type: 'prep' as const,
        priority: 'medium' as const,
        equipment: ['cutting board', 'knife', 'mixing bowls'],
        tips: `Organize all ingredients before starting to cook ${recipe.recipeName}`
      },
      {
        id: `cook-${recipeIndex}`,
        recipeId: `recipe-${recipeIndex}`,
        recipeName: recipe.recipeName,
        step: `Cook ${recipe.recipeName}`,
        startTime: baseStartTime + Math.max(5, Math.min(prepTime, 15)),
        duration: Math.max(10, Math.min(cookTime, 30)), // 10-30 minutes cooking
        type: recipe.recipeName.toLowerCase().includes('pasta') ? 'active' : 
              recipe.recipeName.toLowerCase().includes('bake') ? 'passive' : 'active',
        priority: 'high' as const,
        equipment: recipe.recipeName.toLowerCase().includes('pasta') ? ['large pot', 'strainer'] :
                  recipe.recipeName.toLowerCase().includes('stir') ? ['wok', 'spatula'] : 
                  ['skillet', 'spatula'],
        tips: `Monitor ${recipe.recipeName} closely during cooking for best results`
      }
    ];
  });
  
  // Sort steps by start time
  steps.sort((a, b) => a.startTime - b.startTime);
  
  // Calculate total time
  const lastStep = steps[steps.length - 1];
  const totalTime = lastStep ? lastStep.startTime + lastStep.duration : 45;
  
  return {
    totalTime,
    servingTime: request.preferredServingTime || "Ready when cooking is complete",
    steps,
    recipes: recipes.map(recipe => ({
      recipeName: recipe.recipeName,
      estimatedFinishTime: "45-60 minutes"
    })),
    efficiencyTips: [
      "Prepare all ingredients before starting any cooking",
      "Use multiple burners to cook dishes simultaneously",
      "Clean as you go to maintain an organized workspace",
      "Start with dishes that take the longest to cook",
      `Coordinate ${recipeCount} recipes for optimal timing`
    ],
    timelineSummary: `Smart cooking schedule for ${recipeCount} recipe${recipeCount > 1 ? 's' : ''}. We'll stagger preparation and cooking times to minimize kitchen chaos and ensure everything finishes around the same time. This ${request.skillLevel.toLowerCase()}-friendly approach balances efficiency with manageable timing.`
  };
};

export const generateCookingSchedule = async (request: CookingPathRequest): Promise<CookingSchedule> => {
  if (!isAIAvailable()) {
    // Return sample schedule when API is not available
    console.info('Using demo cooking schedule - API not available');
    return getSampleCookingSchedule(request);
  }

  try {
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

    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: cookingScheduleSchema,
        }
    });

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
      console.error("Failed to generate cooking schedule:", error);
      // Fallback to sample schedule on error
      return getSampleCookingSchedule(request);
  }
};

// Sample reinvented recipes for demo mode
const getSampleReinventedRecipes = (request: RecipeReinventionRequest): Recipe[] => {
  const dishName = request.dishName.toLowerCase();
  const personality = request.chefPersonality;
  
  // Generate creative variations based on the dish name
  const variations = [
    {
      recipeName: `Gourmet ${request.dishName} Supreme`,
      ingredients: [
        "Premium main ingredient (adjusted for dish)",
        "2 tbsp high-quality olive oil",
        "1 tsp gourmet herbs and spices",
        "2 cloves fresh garlic, minced",
        "1/2 cup organic vegetables",
        "1/4 cup artisanal cheese (if applicable)",
        "Fresh herbs for garnish",
        "Sea salt and cracked pepper"
      ],
      cookingTime: "30 minutes",
      difficulty: "Medium" as const,
      instructions: [
        `Elevate the classic ${request.dishName} with premium ingredients`,
        "Prepare all ingredients with careful attention to quality",
        "Use refined cooking techniques for restaurant-quality results",
        "Layer flavors gradually for complex taste profile",
        "Present with artistic plating and garnish"
      ],
      calories: "320 calories",
      servingSize: "Serves 2",
      nutrition: {
        protein: "22g",
        carbs: "28g",
        fat: "14g",
        fiber: "5g",
        sodium: "420mg"
      },
      prepTime: "12 minutes",
      cookTime: "18 minutes",
      chefPersonality: personality,
      personalityTips: getPersonalityTips(personality, `Gourmet ${request.dishName}`)
    },
    {
      recipeName: `Quick & Easy ${request.dishName} Bowl`,
      ingredients: [
        "Main ingredient (simplified preparation)",
        "1 tbsp vegetable oil",
        "1 tsp ready-made seasoning blend",
        "1 cup quick-cooking vegetables",
        "1/2 cup convenient base (rice/pasta)",
        "2 tbsp sauce or dressing",
        "Optional protein addition",
        "Fresh toppings for crunch"
      ],
      cookingTime: "20 minutes",
      difficulty: "Easy" as const,
      instructions: [
        `Transform ${request.dishName} into a quick, satisfying bowl`,
        "Use time-saving preparation methods",
        "Combine ingredients efficiently in one bowl",
        "Add fresh elements for texture and nutrition",
        "Serve immediately while warm"
      ],
      calories: "280 calories",
      servingSize: "Serves 1",
      nutrition: {
        protein: "18g",
        carbs: "35g",
        fat: "10g",
        fiber: "6g",
        sodium: "380mg"
      },
      prepTime: "6 minutes",
      cookTime: "14 minutes",
      chefPersonality: personality,
      personalityTips: getPersonalityTips(personality, `Quick ${request.dishName}`)
    },
    {
      recipeName: `Healthy ${request.dishName} Makeover`,
      ingredients: [
        "Lean protein or plant-based alternative",
        "1 tbsp heart-healthy oil",
        "2 cups colorful vegetables",
        "1 tsp antioxidant-rich spices",
        "1/2 cup whole grain component",
        "Fresh herbs and microgreens",
        "Lemon juice for brightness",
        "Minimal salt, maximum flavor"
      ],
      cookingTime: "25 minutes",
      difficulty: "Easy" as const,
      instructions: [
        `Reinvent ${request.dishName} with health-conscious choices`,
        "Focus on nutrient-dense ingredients",
        "Use cooking methods that preserve nutrition",
        "Balance macronutrients for sustained energy",
        "Garnish with fresh, vitamin-rich elements"
      ],
      calories: "240 calories",
      servingSize: "Serves 2",
      nutrition: {
        protein: "20g",
        carbs: "25g",
        fat: "8g",
        fiber: "8g",
        sodium: "290mg"
      },
      prepTime: "10 minutes",
      cookTime: "15 minutes",
      chefPersonality: personality,
      personalityTips: getPersonalityTips(personality, `Healthy ${request.dishName}`)
    }
  ];
  
  return variations;
};

export const reinventRecipe = async (request: RecipeReinventionRequest): Promise<Recipe[]> => {
  if (!isAIAvailable()) {
    // Return sample reinvented recipes when API is not available
    console.info('Using demo reinvented recipes - API not available');
    return getSampleReinventedRecipes(request);
  }

  try {
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
    
    const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: recipeSchema,
        }
    });

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    // Add the chef personality to each recipe
    const recipesWithPersonality = result.recipes.map((recipe: Recipe) => ({
        ...recipe,
        chefPersonality: request.chefPersonality
    }));
    return recipesWithPersonality;
  } catch (error) {
      console.error("Failed to reinvent recipe:", error);
      // Fallback to sample reinvented recipes on error
      return getSampleReinventedRecipes(request);
  }
};