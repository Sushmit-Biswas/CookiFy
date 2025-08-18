import { ChefPersonality } from '../types';

interface VoiceConfig {
  pitch: number;
  rate: number;
  voiceName?: string;
}

const CHEF_VOICE_CONFIGS: Record<ChefPersonality, VoiceConfig> = {
  [ChefPersonality.MICHELIN]: {
    pitch: 1.3,
    rate: 0.85,
    voiceName: 'female'
  },
  [ChefPersonality.BUDGET_MOM]: {
    pitch: 0.7,
    rate: 0.9,
    voiceName: 'female'
  },
  [ChefPersonality.QUICK_CHEF]: {
    pitch: 1.1,
    rate: 1.05,
    voiceName: 'female'
  },
  [ChefPersonality.NORMAL]: {
    pitch: 1.0,
    rate: 1.0,
    voiceName: 'female'
  }
};
const CHEF_DESCRIPTIONS: Record<ChefPersonality, string> = {
  [ChefPersonality.MICHELIN]: "Hi there! I am Chef Aria, your Michelin-style culinary expert. I love creating restaurant-quality dishes with advanced techniques and elegant plating. Let's cook something extraordinary together!",
  [ChefPersonality.BUDGET_MOM]: "Hello! I'm Chef Rosa, your friendly budget mom. I specialize in practical, affordable meals for families using simple ingredients. Let's make delicious food without breaking the bank!",
  [ChefPersonality.QUICK_CHEF]: "Hey! I'm Chef Luna, your quick and efficient kitchen companion. I focus on fast recipes and time-saving tricks for busy cooks like you. Ready to whip up something tasty in no time?",
  [ChefPersonality.NORMAL]: "Namaste! I'm Chef Priya, here to guide you with clear, step-by-step instructions for everyday home cooking. Let's enjoy making great food together!"
};

class VoiceService {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  isAvailable(): boolean {
    return 'speechSynthesis' in window && !!window.speechSynthesis;
  }

  // Simple method for chef introduction
  speakChefDescription(chefPersonality: ChefPersonality, onStart?: () => void, onEnd?: () => void): void {
    if (this.isPlaying) {
      this.stop();
      return;
    }

    const description = CHEF_DESCRIPTIONS[chefPersonality];
    const config = CHEF_VOICE_CONFIGS[chefPersonality];
    
    this.currentUtterance = new SpeechSynthesisUtterance(description);
    
    const voice = this.getFemaleVoice(chefPersonality);
    if (voice) {
      this.currentUtterance.voice = voice;
    }
    
    this.currentUtterance.pitch = config.pitch;
    this.currentUtterance.rate = config.rate;
    this.currentUtterance.volume = 1;
    
    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      onStart?.();
    };
    
    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    };
    
    this.currentUtterance.onerror = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    };
    
    this.synth.speak(this.currentUtterance);
  }

  private normalizeText(text: string): string {
    return text
      // Indian metrics - keep these
      .replace(/\b(\d+)\s*g\b/gi, '$1 grams')
      .replace(/\b(\d+)\s*kg\b/gi, '$1 kilograms')
      .replace(/\b(\d+)\s*ml\b/gi, '$1 milliliters')
      .replace(/\b(\d+)\s*l\b/gi, '$1 liters')
      
      // Convert foreign measurements to Indian (direct 1:1 conversions for simplicity)
      .replace(/\b(\d+)\s*lbs?\b/gi, '$1 kilograms')
      .replace(/\b(\d+)\s*pounds?\b/gi, '$1 kilograms')
      .replace(/\b(\d+)\s*oz\b/gi, '$1 grams')
      .replace(/\b(\d+)\s*ounces?\b/gi, '$1 grams')
      .replace(/\b(\d+)\s*gallons?\b/gi, '$1 liters')
      
      // Common cooking terms
      .replace(/\btsp\b/gi, 'teaspoon')
      .replace(/\btbsp\b/gi, 'tablespoon')
      .replace(/\bcup\b/gi, 'cup')
      .replace(/\bcups\b/gi, 'cups')
      
      // Temperature
      .replace(/(\d+)°C/gi, '$1 degrees Celsius')
      .replace(/(\d+)°F/gi, '$1 degrees Fahrenheit');
  }

  private getFemaleVoice(chefPersonality: ChefPersonality): SpeechSynthesisVoice | null {
    const voices = this.synth.getVoices();
    
    // Voice names distributed among 4 chef personalities
    const chefVoiceNames: Record<ChefPersonality, string[]> = {
      [ChefPersonality.MICHELIN]: [
        'zira', 'hazel', 'samantha', 'karen', 'victoria', 'moira', 'susan', 'allison', 'ava'
      ],
      [ChefPersonality.BUDGET_MOM]: [
        'lucy', 'emma', 'olivia', 'julie', 'mary', 'jane', 'tessa', 'zira'
      ],
      [ChefPersonality.QUICK_CHEF]: [
        'sharon', 'heather', 'tracy', 'ashley', 'michelle', 'laura', 'anna', 'amy', 'joanna', 'zira'
      ],
      [ChefPersonality.NORMAL]: [
        'jenny', 'catherine', 'angel', 'angela', 'female', 'zira'
      ]
    };

    // 1. Try to find a voice with gender property 'female'
    const femaleByGender = voices.find(v => (v as any).gender === 'female');
    if (femaleByGender) return femaleByGender;

    // 2. Try to find a voice with names specific to this chef personality
    const personalityVoiceNames = chefVoiceNames[chefPersonality];
    for (const name of personalityVoiceNames) {
      const voice = voices.find(v => v.name.toLowerCase().includes(name));
      if (voice) return voice;
    }

    // 3. Try to find any voice with 'female' in the name
    const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female'));
    if (femaleVoice) return femaleVoice;

    // 4. Fallback to any English voice
    const englishVoice = voices.find(v => v.lang.includes('en'));
    if (englishVoice) return englishVoice;

    // 5. Fallback to first available
    return voices[0] || null;
  }

  // Method for reading complete recipe (name, ingredients, instructions)
  speakCompleteRecipe(recipe: any, chefPersonality: ChefPersonality, onStart?: () => void, onEnd?: () => void): void {
    if (this.isPlaying) {
      this.stop();
      return;
    }

    const config = CHEF_VOICE_CONFIGS[chefPersonality];
    
    // Build complete recipe text
    const recipeText = [
      `Recipe: ${recipe.recipeName}.`,
      `Ingredients: ${recipe.ingredients.join(', ')}.`,
      `Instructions: ${recipe.instructions.map((instruction: string, index: number) => 
        `Step ${index + 1}. ${this.normalizeText(instruction)}`
      ).join('. ')}.`
    ].join(' ');
    
    this.currentUtterance = new SpeechSynthesisUtterance(recipeText);
    
    const voice = this.getFemaleVoice(chefPersonality);
    if (voice) {
      this.currentUtterance.voice = voice;
    }
    
    this.currentUtterance.pitch = config.pitch;
    this.currentUtterance.rate = config.rate;
    this.currentUtterance.volume = 1;
    
    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      onStart?.();
    };
    
    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    };
    
    this.currentUtterance.onerror = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    };
    
    this.synth.speak(this.currentUtterance);
  }

  // Simple method for recipe instructions
  speakRecipeInstructions(instructions: string[], chefPersonality: ChefPersonality, onStart?: () => void, onEnd?: () => void): void {
    if (this.isPlaying) {
      this.stop();
      return;
    }

    const config = CHEF_VOICE_CONFIGS[chefPersonality];
    const normalizedInstructions = instructions.map((instruction, index) => 
      `Step ${index + 1}. ${this.normalizeText(instruction)}`
    ).join('. ');
    
    this.currentUtterance = new SpeechSynthesisUtterance(normalizedInstructions);
    
    const voice = this.getFemaleVoice(chefPersonality);
    if (voice) {
      this.currentUtterance.voice = voice;
    }
    
    this.currentUtterance.pitch = config.pitch;
    this.currentUtterance.rate = config.rate;
    this.currentUtterance.volume = 1;
    
    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      onStart?.();
    };
    
    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    };
    
    this.currentUtterance.onerror = () => {
      this.isPlaying = false;
      this.currentUtterance = null;
      onEnd?.();
    };
    
    this.synth.speak(this.currentUtterance);
  }

  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.currentUtterance = null;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

export const voiceService = new VoiceService();
