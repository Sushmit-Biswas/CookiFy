import React, { useState, useCallback } from 'react';
import { DIETARY_PREFERENCES, CHEF_PERSONALITIES, FLAVOR_PROFILES, RECIPE_STYLES } from '../../utils';
import { DietaryPreference, ChefPersonality, FlavorProfile, RecipeStyle, type RecipeWithImage } from '../../types';
import { reinventRecipe, generateRecipeImage, isDemoMode } from '../../services/geminiService';
import Spinner from '../ui/Spinner';
import RecipeCard from '../ui/RecipeCard';
import CookingPath from './CookingPath';
import VoiceControl from '../ui/VoiceControl';
import DemoModeNotice from '../ui/DemoModeNotice';
import { useNotification } from '../../contexts/NotificationContext';
import { RefreshCw, Sparkles, Clock, Dish, Salad, Flame, Globe, X, User } from '../ui/Icons';

interface ReinventionPageProps {
  onSaveRecipe: (recipe: RecipeWithImage) => void;
  isRecipeSaved: (recipeName: string) => boolean;
}

const ReinventionPage: React.FC<ReinventionPageProps> = ({ onSaveRecipe, isRecipeSaved }) => {
  const [reinventionDish, setReinventionDish] = useState<string>('');
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(DietaryPreference.NONE);
  const [chefPersonality, setChefPersonality] = useState<ChefPersonality>(ChefPersonality.NORMAL);
  const [flavorProfile, setFlavorProfile] = useState<FlavorProfile>(FlavorProfile.NONE);
  const [recipeStyle, setRecipeStyle] = useState<RecipeStyle>(RecipeStyle.NONE);
  const [excludeIngredients, setExcludeIngredients] = useState<string>('');
  const [recipes, setRecipes] = useState<RecipeWithImage[]>([]);
  const [isReinventing, setIsReinventing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipes, setSelectedRecipes] = useState<RecipeWithImage[]>([]);
  const [showCookingPath, setShowCookingPath] = useState<boolean>(false);
  const [showDemoNotice, setShowDemoNotice] = useState<boolean>(isDemoMode());
  const { showNotification } = useNotification();

  const toggleRecipeSelection = (recipe: RecipeWithImage) => {
    setSelectedRecipes(prev => {
      const isSelected = prev.some(r => r.recipeName === recipe.recipeName);
      if (isSelected) {
        showNotification('success', `${recipe.recipeName} removed from cooking path`);
        return prev.filter(r => r.recipeName !== recipe.recipeName);
      } else {
        showNotification('success', `${recipe.recipeName} added to cooking path`);
        return [...prev, recipe];
      }
    });
  };

  const handleStartCookingPath = () => {
    if (selectedRecipes.length === 0) {
      setError("Please select at least one recipe for the cooking path.");
      return;
    }
    setShowCookingPath(true);
  };

  // Removed the early return for cooking path to fix black screen issue
  // The cooking path will be rendered as a modal instead

  const handleReinventRecipe = useCallback(async () => {
    if (!reinventionDish.trim()) {
      setError("Please enter a dish name to reinvent.");
      return;
    }

    setIsReinventing(true);
    setError(null);
    setRecipes([]);

    try {
      const reinventedRecipes = await reinventRecipe({
        dishName: reinventionDish,
        chefPersonality,
        dietaryPreference: dietaryPreference === DietaryPreference.NONE ? undefined : dietaryPreference,
        flavorProfile: flavorProfile === FlavorProfile.NONE ? undefined : flavorProfile,
        recipeStyle: recipeStyle === RecipeStyle.NONE ? undefined : recipeStyle,
        excludeIngredients: excludeIngredients.trim() || undefined
      });

      const recipesWithImages = await Promise.all(
        reinventedRecipes.map(async (recipe) => {
          const imageUrl = await generateRecipeImage({
            recipeName: recipe.recipeName,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions
          });
          return { ...recipe, imageUrl };
        })
      );
      
      setRecipes(recipesWithImages);

    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(`Failed to reinvent recipe. The AI might be busy, or there was an issue with the request. Please try again. (Details: ${message})`);
    } finally {
      setIsReinventing(false);
    }
  }, [reinventionDish, chefPersonality, dietaryPreference, flavorProfile, excludeIngredients]);

  const getChefPersonalityDescription = (personality: ChefPersonality): string => {
    switch (personality) {
      case ChefPersonality.MICHELIN:
        return "Chef Aria - Sophisticated techniques with elegant enthusiasm";
      case ChefPersonality.BUDGET_MOM:
        return "Chef Rosa - Practical wisdom for family-friendly budget cooking";
      case ChefPersonality.QUICK_CHEF:
        return "Chef Luna - High-energy efficiency and clever time-saving tricks";
      default:
        return "Chef Priya - Warm, approachable guidance for all skill levels";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
      {/* Demo Mode Notice */}
      <DemoModeNotice 
        show={showDemoNotice} 
        onDismiss={() => setShowDemoNotice(false)} 
      />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10"></div>
        <div className="relative container mx-auto max-w-7xl px-4 pt-16 pb-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-purple-200">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
              <span className="text-purple-700 font-semibold text-lg">AI-Powered Culinary Innovation</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-violet-600 bg-clip-text text-transparent mb-6">
              Recipe Reinvention Lab
            </h1>
            <p className="text-xl md:text-2xl text-slate-700 max-w-4xl mx-auto leading-relaxed">
              Transform classic dishes into <span className="font-semibold text-purple-600">innovative culinary masterpieces</span>. 
              Our AI chefs blend traditional flavors with modern techniques to create extraordinary dining experiences.
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-sm">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-slate-600">AI-Enhanced Creativity</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-sm">
                <RefreshCw className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-slate-600">Infinite Variations</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full shadow-sm">
                <Clock className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-slate-600">Instant Results</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 pb-16">
        {/* Configuration Panel */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 md:p-12 mb-16">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Primary Input Section */}
            <div className="lg:col-span-1 space-y-8">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Start Your Culinary Journey</h2>
                <p className="text-slate-600">Enter any dish and watch our AI chefs reimagine it with creative flair.</p>
              </div>
              
              <div className="space-y-6">
                <div className="group">
                  <label htmlFor="reinvention-dish" className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                    <Dish className="w-5 h-5" />
                    Dish to Reinvent
                  </label>
                  <div className="relative">
                    <input
                      id="reinvention-dish"
                      type="text"
                      placeholder="e.g., Momo, Fish & Chips ..."
                      value={reinventionDish}
                      onChange={e => setReinventionDish(e.target.value)}
                      className="w-full p-4 pl-6 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-purple-400/20 focus:border-purple-400 transition-all duration-300 text-lg bg-white/80 backdrop-blur-sm"
                      onKeyPress={e => e.key === 'Enter' && !isReinventing && reinventionDish.trim() && handleReinventRecipe()}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-2 ml-1">Our AI will analyze and reimagine your chosen dish</p>
                </div>

                <div className="group">
                  <label htmlFor="exclude-ingredients" className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                    <X className="w-5 h-5" />
                    Ingredients to Avoid
                  </label>
                  <input
                    id="exclude-ingredients"
                    type="text"
                    placeholder="e.g., nuts, shellfish, dairy, gluten ..."
                    value={excludeIngredients}
                    onChange={e => setExcludeIngredients(e.target.value)}
                    className="w-full p-4 pl-6 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-purple-400/20 focus:border-purple-400 transition-all duration-300 bg-white/80 backdrop-blur-sm"
                  />
                  <p className="text-sm text-slate-500 mt-2 ml-1">Allergens and ingredients to exclude from recipes</p>
                </div>
              </div>
            </div>

            {/* Chef & Preferences Section */}
            <div className="lg:col-span-2 space-y-8">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Customize Your Experience</h2>
                <p className="text-slate-600">Choose your AI chef and culinary preferences for personalized results.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Chef Personality Card */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <label htmlFor="chef-personality" className="flex items-center gap-2 text-lg font-semibold text-slate-700">
                      <User className="w-5 h-5" />
                      AI Chef Personality
                    </label>
                    <VoiceControl chefPersonality={chefPersonality} />
                  </div>
                  <select 
                    id="chef-personality"
                    value={chefPersonality}
                    onChange={e => setChefPersonality(e.target.value as ChefPersonality)}
                    className="w-full p-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-400/20 focus:border-purple-400 transition-all duration-300 bg-white/90 text-lg font-medium"
                  >
                    {CHEF_PERSONALITIES.map(personality => <option key={personality} value={personality}>{personality}</option>)}
                  </select>
                  <div className="mt-3 p-3 bg-white/70 rounded-lg">
                    <p className="text-sm text-purple-700 font-medium">{getChefPersonalityDescription(chefPersonality)}</p>
                  </div>
                </div>

                {/* Preferences Grid */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200/50">
                    <label htmlFor="dietary-preference" className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3">
                      <Salad className="w-5 h-5" />
                      Dietary Preference
                    </label>
                    <select 
                      id="dietary-preference"
                      value={dietaryPreference}
                      onChange={e => setDietaryPreference(e.target.value as DietaryPreference)}
                      className="w-full p-3 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-400/20 focus:border-blue-400 transition-all duration-300 bg-white/90"
                    >
                      {DIETARY_PREFERENCES.map(pref => <option key={pref} value={pref}>{pref}</option>)}
                    </select>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
                    <label htmlFor="flavor-profile" className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3">
                      <Flame className="w-5 h-5" />
                      Flavor Profile
                    </label>
                    <select 
                      id="flavor-profile"
                      value={flavorProfile}
                      onChange={e => setFlavorProfile(e.target.value as FlavorProfile)}
                      className="w-full p-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 transition-all duration-300 bg-white/90"
                    >
                      {FLAVOR_PROFILES.map(flavor => <option key={flavor} value={flavor}>{flavor}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200/50">
                <label htmlFor="recipe-style" className="flex items-center gap-2 text-lg font-semibold text-slate-700 mb-3">
                  <Globe className="w-5 h-5" />
                  Recipe Style
                </label>
                <select 
                  id="recipe-style"
                  value={recipeStyle}
                  onChange={e => setRecipeStyle(e.target.value as RecipeStyle)}
                  className="w-full p-4 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all duration-300 bg-white/90"
                >
                  {RECIPE_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
                <p className="text-sm text-emerald-700 mt-2 ml-1">Select your preferred cuisine style for the reinvention</p>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="mt-12 text-center">
            <div className="mb-8">
              <button
                onClick={handleReinventRecipe}
                disabled={!reinventionDish.trim() || isReinventing}
                className="group relative inline-flex items-center justify-center gap-4 bg-gradient-to-r from-purple-600 via-pink-600 to-violet-600 text-white font-bold py-6 px-12 rounded-2xl shadow-2xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:scale-100 text-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 via-pink-700 to-violet-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center gap-4">
                  {isReinventing ? (
                    <>
                      <Spinner />
                      <span>AI Chefs Working Their Magic...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-7 h-7" />
                      <span>Begin Culinary Reinvention</span>
                      <Sparkles className="w-7 h-7" />
                    </>
                  )}
                </span>
              </button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                <span>✨</span>
                <span>Your chef personality adds unique creative flair</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                <span>🎯</span>
                <span>Personalized to your taste preferences</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                <span>⚡</span>
                <span>Multiple creative variations generated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-xl shadow-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isReinventing && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center border border-purple-200/50">
              <div className="animate-pulse">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <Spinner />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-4">AI Chefs at Work</h3>
                <p className="text-lg text-slate-600 mb-6">Our culinary AI is analyzing your dish and crafting innovative variations...</p>
                <div className="flex justify-center space-x-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-3 h-3 bg-violet-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {recipes.length > 0 && (
          <div className="max-w-7xl mx-auto">
            {/* Results Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 mb-6 px-8 py-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full shadow-lg border border-emerald-200">
                <Sparkles className="w-8 h-8 text-emerald-600" />
                <span className="text-emerald-700 font-bold text-xl">Reinvention Complete!</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                Creative Variations of "<span className="text-purple-600">{reinventionDish}</span>"
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Our AI chefs have reimagined your dish with innovative techniques and creative twists. 
                Each variation offers a unique culinary experience while honoring the original's essence.
              </p>
            </div>

            {/* Recipe Grid */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
              {recipes.map((recipe, index) => {
                const isSelected = selectedRecipes.some(r => r.recipeName === recipe.recipeName);
                return (
                  <div key={recipe.recipeName} className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>
                    <div className="relative bg-white rounded-2xl overflow-hidden">
                      <RecipeCard 
                        recipe={recipe} 
                        onSave={onSaveRecipe} 
                        isSaved={isRecipeSaved(recipe.recipeName)} 
                        onAddToCookingPath={toggleRecipeSelection}
                        isInCookingPath={isSelected}
                      />
                    </div>
                    {/* Recipe Number Badge */}
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg z-10">
                      {index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Cooking Path Section */}
            {selectedRecipes.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-violet-50 rounded-3xl shadow-2xl border border-purple-200/50 p-12 mb-16">
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-purple-200">
                    <Clock className="w-8 h-8 text-purple-600" />
                    <span className="text-purple-700 font-semibold text-lg">Cooking Path Mode</span>
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold">NEW</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                    Smart Kitchen Management
                  </h3>
                  <p className="text-lg text-slate-600 mb-8 max-w-3xl mx-auto">
                    Get an optimized cooking schedule for your {selectedRecipes.length} selected recipe{selectedRecipes.length > 1 ? 's' : ''}. 
                    Our AI will coordinate preparation times, cooking steps, and kitchen resources to minimize downtime and maximize efficiency.
                  </p>
                  
                  {/* Selected Recipes Display */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-purple-200/50">
                    <h4 className="text-lg font-semibold text-slate-700 mb-4">Selected for Cooking Path:</h4>
                    <div className="flex flex-wrap justify-center gap-3">
                      {selectedRecipes.map((recipe, index) => (
                        <div key={index} className="group flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 rounded-xl text-sm font-medium border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200">
                          <span className="flex-1">{recipe.recipeName}</span>
                          <button
                            onClick={() => toggleRecipeSelection(recipe)}
                            className="w-6 h-6 bg-purple-200 hover:bg-purple-300 rounded-full flex items-center justify-center text-purple-600 hover:text-purple-800 transition-colors text-xs font-bold group-hover:scale-110"
                            title="Remove from cooking path"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleStartCookingPath}
                    className="group relative bg-gradient-to-r from-purple-600 via-pink-600 to-violet-600 text-white font-bold py-6 px-12 rounded-2xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 flex items-center gap-4 mx-auto text-lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-700 via-pink-700 to-violet-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center gap-4">
                      <Sparkles className="w-7 h-7" />
                      <span>Create Smart Cooking Schedule</span>
                      <Clock className="w-7 h-7" />
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Call to Action */}
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-violet-100 rounded-3xl p-12 border border-purple-200/50">
                <h3 className="text-3xl font-bold text-slate-800 mb-4">Love What You See?</h3>
                <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                  Save your favorite reinventions and try creating new variations with different chef personalities and cuisine styles.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => {
                      setReinventionDish('');
                      setRecipes([]);
                      setError(null);
                    }}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    Reinvent Another Dish
                  </button>
                  <button
                    onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
                    className="bg-white text-purple-600 border-2 border-purple-200 font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-purple-400"
                  >
                    Back to Top
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cooking Path Modal */}
      {showCookingPath && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <CookingPath 
              selectedRecipes={selectedRecipes} 
              onBack={() => setShowCookingPath(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReinventionPage;
