import React, { useState } from 'react';
import { Recipe, CookingSchedule, CookingStep } from '../../types';
import { generateCookingSchedule } from '../../services/geminiService';
import Spinner from '../ui/Spinner';
import { Clock, Utensils, Timer, AlertCircle, CheckCircle2, Play, Pause, Dish, ChefHat, CookingPot, Flame, BarChart, Users, FileText, Sparkles } from '../ui/Icons';

interface CookingPathProps {
  selectedRecipes: Recipe[];
  onBack: () => void;
}

const CookingPath: React.FC<CookingPathProps> = ({ selectedRecipes, onBack }) => {
  const [schedule, setSchedule] = useState<CookingSchedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [servingTime, setServingTime] = useState<string>('');
  const [equipment, setEquipment] = useState<string>('');
  
  // Timer state for active cooking
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [servingAdjustments, setServingAdjustments] = useState<{[recipeName: string]: number}>({});

  // Timer effect - ALWAYS call this hook
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && schedule) { // Only run timer if we have a schedule
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, schedule]);

  // Helper functions - define all functions before any conditional returns
  const generateSchedule = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setIsTimerActive(false);
    setElapsedSeconds(0);
    
    try {
      const cookingRequest = {
        recipes: selectedRecipes,
        preferredServingTime: servingTime || undefined,
        kitchenEquipment: equipment ? equipment.split(',').map(e => e.trim()) : undefined,
        skillLevel
      };
      
      const generatedSchedule = await generateCookingSchedule(cookingRequest);
      setSchedule(generatedSchedule);
    } catch (err) {
      setError('Failed to generate cooking schedule. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const markStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    // Auto-advance to next step if timer is active
    if (isTimerActive && schedule) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < schedule.steps.length) {
        setCurrentStepIndex(nextIndex);
      }
    }
  };

  const startTimer = () => {
    setIsTimerActive(!isTimerActive);
  };

  const getCurrentStepStatus = (step: CookingStep): 'upcoming' | 'current' | 'active' | 'completed' => {
    if (!isTimerActive) return 'upcoming';
    
    const currentTimeMinutes = Math.floor(elapsedSeconds / 60);
    const stepStartTime = step.startTime;
    const stepEndTime = step.startTime + step.duration;
    
    if (currentTimeMinutes >= stepStartTime && currentTimeMinutes < stepEndTime) {
      return 'active';
    } else if (currentTimeMinutes >= stepEndTime) {
      return 'completed';
    } else if (currentTimeMinutes >= stepStartTime - 2) { // 2 minutes before
      return 'current';
    }
    return 'upcoming';
  };

  const formatTimeDisplay = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepStatus = (step: CookingStep, index: number): 'upcoming' | 'current' | 'completed' | 'active' => {
    if (completedSteps.has(step.id)) return 'completed';
    if (!isTimerActive) return 'upcoming';
    
    const currentTimeMinutes = Math.floor(elapsedSeconds / 60);
    const stepStartTime = step.startTime;
    const stepEndTime = step.startTime + step.duration;
    
    if (currentTimeMinutes >= stepStartTime && currentTimeMinutes < stepEndTime) {
      return 'active';
    } else if (currentTimeMinutes >= stepEndTime) {
      return 'completed';
    } else if (currentTimeMinutes >= stepStartTime - 2) { // 2 minutes before
      return 'current';
    }
    return 'upcoming';
  };

  const getTimeUntilStep = (step: CookingStep): string => {
    if (!isTimerActive) return '';
    
    const currentTimeMinutes = Math.floor(elapsedSeconds / 60);
    const timeUntil = step.startTime - currentTimeMinutes;
    
    if (timeUntil > 0) {
      return `in ${formatTime(timeUntil)}`;
    } else if (timeUntil === 0) {
      return 'START NOW!';
    } else {
      const timeRemaining = (step.startTime + step.duration) - currentTimeMinutes;
      if (timeRemaining > 0) {
        return `${formatTime(timeRemaining)} remaining`;
      }
      return 'should be done';
    }
  };

  const getStepTypeIcon = (type: 'prep' | 'active' | 'passive') => {
    switch (type) {
      case 'prep': return <Utensils className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'passive': return <Timer className="w-4 h-4" />;
    }
  };

  const getStepTypeColor = (type: 'prep' | 'active' | 'passive') => {
    switch (type) {
      case 'prep': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'passive': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getCurrentStep = (): CookingStep | null => {
    if (!schedule || currentStepIndex >= schedule.steps.length) return null;
    return schedule.steps[currentStepIndex];
  };

  // Conditional rendering - now all hooks have been called
  if (!schedule) {
    setIsGenerating(true);
    setError(null);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setIsTimerActive(false);
    setElapsedSeconds(0);
    
    try {
      // Apply serving adjustments to recipes
      const adjustedRecipes = selectedRecipes.map(recipe => {
        const adjustment = servingAdjustments[recipe.recipeName] || 1;
        if (adjustment === 1) return recipe;
        
        // Adjust ingredients quantities with better number parsing
        const adjustedIngredients = recipe.ingredients.map(ingredient => {
          // Handle various number formats: "2 cups", "1/2 tbsp", "1.5 kg", etc.
          return ingredient.replace(/(\d+(?:\.\d+)?(?:\/\d+)?)/g, (match) => {
            // Handle fractions like "1/2"
            if (match.includes('/')) {
              const [numerator, denominator] = match.split('/');
              const fractionValue = parseFloat(numerator) / parseFloat(denominator);
              const adjustedValue = fractionValue * adjustment;
              // Convert back to fraction if result is simple, otherwise use decimal
              if (adjustedValue < 1 && adjustedValue * 2 === Math.floor(adjustedValue * 2)) {
                return `${Math.floor(adjustedValue * 2)}/2`;
              } else if (adjustedValue < 1 && adjustedValue * 4 === Math.floor(adjustedValue * 4)) {
                return `${Math.floor(adjustedValue * 4)}/4`;
              }
              return adjustedValue.toString();
            } else {
              const num = parseFloat(match);
              const adjusted = num * adjustment;
              // Round to reasonable precision
              return adjusted % 1 === 0 ? adjusted.toString() : adjusted.toFixed(1);
            }
          });
        });

        // Adjust cooking times if serving size significantly changes
        let adjustedPrepTime = recipe.prepTime;
        let adjustedCookTime = recipe.cookTime || recipe.cookingTime;
        
        if (adjustment > 2) {
          // For large serving increases, add some extra prep time
          const prepMinutes = parseInt(adjustedPrepTime?.match(/\d+/)?.[0] || '10');
          const extraPrepTime = Math.ceil(prepMinutes * 0.3); // 30% more prep time
          adjustedPrepTime = `${prepMinutes + extraPrepTime} minutes`;
        } else if (adjustment < 0.75) {
          // For smaller serving sizes, slightly reduce prep time
          const prepMinutes = parseInt(adjustedPrepTime?.match(/\d+/)?.[0] || '10');
          const reducedPrepTime = Math.max(5, Math.ceil(prepMinutes * 0.8)); // Minimum 5 minutes
          adjustedPrepTime = `${reducedPrepTime} minutes`;
        }
        
        return {
          ...recipe,
          ingredients: adjustedIngredients,
          servingSize: `Serves ${Math.ceil((parseInt(recipe.servingSize?.match(/\d+/)?.[0] || '2')) * adjustment)}`,
          prepTime: adjustedPrepTime,
          cookTime: adjustedCookTime,
          // Add serving adjustment info for the scheduler
          servingAdjustment: adjustment
        };
      });
      
      const cookingRequest = {
        recipes: adjustedRecipes,
        preferredServingTime: servingTime || undefined,
        kitchenEquipment: equipment ? equipment.split(',').map(e => e.trim()) : undefined,
        skillLevel
      };
      
      const generatedSchedule = await generateCookingSchedule(cookingRequest);
      setSchedule(generatedSchedule);
    } catch (err) {
      setError('Failed to generate cooking schedule. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Conditional rendering - now all hooks have been called
  if (!schedule) {
    return (
      <div className="container mx-auto max-w-5xl p-3 sm:p-4">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                ← Back
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                  <span className="truncate">Smart Cooking Scheduler</span>
                </h1>
                <p className="opacity-90 text-sm sm:text-base mt-1">Create an optimized cooking timeline for multiple dishes</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {/* Selected Recipes */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-800 mb-4 sm:mb-6 flex items-center gap-2">
                <Dish className="w-6 h-6" />
                Selected Recipes ({selectedRecipes.length})
                {Object.values(servingAdjustments).some(adj => adj !== 1) && (
                  <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    Servings Adjusted
                  </span>
                )}
              </h2>
              
              {/* Serving Summary */}
              {Object.values(servingAdjustments).some(adj => adj !== 1) && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-800 font-bold">⚡ Serving Adjustments Impact:</span>
                  </div>
                  <ul className="text-sm text-amber-700 space-y-1">
                    {selectedRecipes.map((recipe, index) => {
                      const adjustment = servingAdjustments[recipe.recipeName] || 1;
                      if (adjustment === 1) return null;
                      return (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                          <strong>{recipe.recipeName}:</strong> {adjustment}x servings
                          {adjustment > 1.5 && <span className="text-xs">(+extra prep time)</span>}
                          {adjustment < 0.8 && <span className="text-xs">(reduced prep time)</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              <div className="grid gap-3 sm:gap-4">
                {selectedRecipes.map((recipe, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg sm:rounded-xl border border-orange-200">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-stone-800 text-base sm:text-lg mb-1 sm:mb-0">{recipe.recipeName}</h3>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm sm:text-base">
                        <span className="flex items-center gap-1 text-stone-600">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          {recipe.cookingTime}
                        </span>
                        <span className="flex items-center gap-1 text-stone-600">
                          <BarChart className="w-4 h-4" />
                          {recipe.difficulty}
                        </span>
                        <span className="flex items-center gap-1 text-stone-600">
                          <Users className="w-4 h-4" />
                          {recipe.servingSize || 'Serves 2-4'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                      <div className="text-center">
                        <label className="text-xs sm:text-sm font-bold text-stone-700 block mb-1">Servings:</label>
                        <select
                          value={servingAdjustments[recipe.recipeName] || 1}
                          onChange={(e) => setServingAdjustments(prev => ({
                            ...prev,
                            [recipe.recipeName]: parseFloat(e.target.value)
                          }))}
                          className={`px-2 sm:px-3 py-2 border-2 rounded-lg text-xs sm:text-sm font-bold focus:ring-2 focus:ring-orange-400 bg-white min-h-[44px] ${
                            (servingAdjustments[recipe.recipeName] || 1) !== 1 
                              ? 'border-amber-400 bg-amber-50 text-amber-800' 
                              : 'border-orange-300'
                          }`}
                        >
                          <option value={0.5}>½x (Half)</option>
                          <option value={1}>1x (Original)</option>
                          <option value={1.5}>1.5x (+50%)</option>
                          <option value={2}>2x (Double)</option>
                          <option value={3}>3x (Triple)</option>
                          <option value={4}>4x (Quadruple)</option>
                        </select>
                        {(servingAdjustments[recipe.recipeName] || 1) !== 1 && (
                          <div className="text-xs text-amber-600 mt-1 font-medium">
                            Modified
                          </div>
                        )}
                      </div>
                      <div className="text-left sm:text-right text-xs sm:text-sm">
                        <div className="text-stone-600">Prep: {recipe.prepTime || '10min'}</div>
                        <div className="text-stone-600">Cook: {recipe.cookTime || recipe.cookingTime}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
              <div className="bg-blue-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-blue-200">
                <label className="block text-base sm:text-lg font-bold text-stone-800 mb-3 flex items-center gap-2">
                  <ChefHat className="w-5 h-5" />
                  Your Cooking Experience
                </label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as any)}
                  className="w-full p-3 sm:p-4 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-base sm:text-lg font-medium min-h-[44px]"
                >
                  <option value="Beginner">● Beginner - Detailed step-by-step guidance</option>
                  <option value="Intermediate">● Intermediate - Some multitasking ability</option>
                  <option value="Advanced">● Advanced - Complex timing coordination</option>
                </select>
                <p className="text-xs sm:text-sm text-blue-700 mt-2">
                  This affects the complexity and timing of your cooking schedule
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-purple-200">
                <label className="block text-base sm:text-lg font-bold text-stone-800 mb-3 flex items-center gap-2">
                  ⏰ Target Serving Time (Optional)
                </label>
                <input
                  type="time"
                  value={servingTime}
                  onChange={(e) => setServingTime(e.target.value)}
                  className="w-full p-3 sm:p-4 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 text-base sm:text-lg font-medium min-h-[44px]"
                />
                <p className="text-xs sm:text-sm text-purple-700 mt-2">
                  When do you want everything ready? We'll work backwards from this time
                </p>
              </div>
            </div>

            <div className="mb-6 sm:mb-8 bg-green-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-green-200">
              <label className="block text-base sm:text-lg font-bold text-stone-800 mb-3 flex items-center gap-2">
                🔧 Available Kitchen Equipment (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., food processor, stand mixer, instant pot, air fryer, pressure cooker"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full p-3 sm:p-4 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-400 text-sm sm:text-lg min-h-[44px]"
              />
              <p className="text-xs sm:text-sm text-green-700 mt-2">
                Tell us what equipment you have so we can optimize your cooking process
              </p>
            </div>

            {/* Serving Adjustment Tips */}
            {Object.values(servingAdjustments).some(adj => adj !== 1) && (
              <div className="mb-6 sm:mb-8 bg-blue-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-blue-200">
                <h3 className="text-base sm:text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
                  💡 Smart Serving Tips
                </h3>
                <div className="space-y-2 text-sm sm:text-base text-blue-700">
                  <p>• Our AI will automatically adjust ingredient quantities and prep times based on your serving size changes</p>
                  <p>• Larger portions may require additional cooking time and equipment considerations</p>
                  <p>• The cooking schedule will account for any extra preparation needed for your customized servings</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border-2 border-red-400 text-red-700 rounded-lg sm:rounded-xl font-medium text-sm sm:text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={generateSchedule}
                disabled={isGenerating || selectedRecipes.length === 0}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 sm:py-6 px-8 sm:px-12 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:scale-100 text-base sm:text-xl flex items-center gap-3 sm:gap-4 mx-auto min-h-[56px] sm:min-h-[64px]"
              >
                {isGenerating ? (
                  <>
                    <Spinner />
                    <span className="hidden sm:inline">Generating Your Smart Cooking Schedule...</span>
                    <span className="sm:hidden">Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                    <span className="hidden sm:inline">Generate Cooking Schedule</span>
                    <span className="sm:hidden">Generate</span>
                  </>
                )}
              </button>
              <p className="text-stone-600 mt-3 sm:mt-4 text-sm sm:text-lg px-2">
                Our AI will create a perfectly timed cooking sequence for all your recipes
                {Object.values(servingAdjustments).some(adj => adj !== 1) && (
                  <span className="block mt-1 text-amber-600 font-medium">
                    ⚡ Optimized for your custom serving sizes
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                ← Back
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                  <span className="truncate">Smart Cooking Schedule</span>
                </h1>
                <p className="opacity-90 text-xs sm:text-sm lg:text-base mt-1">
                  Total Time: {formatTime(schedule.totalTime)} | {selectedRecipes.length} Recipe{selectedRecipes.length > 1 ? 's' : ''}
                  {Object.values(servingAdjustments).some(adj => adj !== 1) && (
                    <span className="text-amber-200 ml-2">
                      • Adjusted for Custom Servings
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setSchedule(null)}
              className="bg-white/20 hover:bg-white/30 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base min-h-[44px] flex items-center justify-center"
            >
              🔄 <span className="hidden sm:inline ml-1">Regenerate</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {/* Timeline Summary */}
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg sm:rounded-xl border border-blue-200">
            <h2 className="text-lg sm:text-xl font-bold text-stone-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              Cooking Strategy & Flow
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4 text-sm sm:text-base lg:text-lg">{schedule.timelineSummary}</p>
            
            {/* Real-time Timer Display */}
            {isTimerActive && (
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:
                      {(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs sm:text-sm text-blue-500 flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      Elapsed Time
                    </div>
                  </div>
                  <div className="text-center sm:text-right">
                    <div className="text-xl sm:text-2xl font-bold text-stone-700">
                      {formatTime(Math.max(0, schedule.totalTime - Math.floor(elapsedSeconds / 60)))}
                    </div>
                    <div className="text-xs sm:text-sm text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Remaining
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 mb-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 sm:h-4 rounded-full transition-all duration-1000 flex items-center justify-end pr-1 sm:pr-2"
                    style={{ 
                      width: `${Math.min(100, (Math.floor(elapsedSeconds / 60) / schedule.totalTime) * 100)}%` 
                    }}
                  >
                    <span className="text-white text-xs font-bold hidden sm:inline">
                      {Math.round((Math.floor(elapsedSeconds / 60) / schedule.totalTime) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>🕐 Start</span>
                  <span className="font-medium">{Math.round((Math.floor(elapsedSeconds / 60) / schedule.totalTime) * 100)}%</span>
                  <span>🏁 {formatTime(schedule.totalTime)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Professional Kitchen Tips */}
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg sm:rounded-xl border border-green-200">
            <h2 className="text-lg sm:text-xl font-bold text-stone-800 mb-3 sm:mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Professional Kitchen Tips
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {schedule.efficiencyTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 bg-white p-3 sm:p-4 rounded-lg border border-green-100">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Timeline - Enhanced */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-800 flex items-center gap-2">
                <CookingPot className="w-6 h-6" />
                Step-by-Step Timeline
              </h2>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                  <span>Active Now</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-orange-500 rounded-full"></div>
                  <span>Coming Up</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                  <span>Completed</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {schedule.steps.map((step, index) => {
                const stepStatus = getStepStatus(step, index);
                const timeInfo = getTimeUntilStep(step);
                
                return (
                  <div
                    key={step.id}
                    className={`relative p-4 sm:p-6 border-l-4 rounded-lg sm:rounded-xl transition-all duration-300 ${
                      stepStatus === 'completed' 
                        ? 'bg-green-50 border-l-green-500 opacity-90' 
                        : stepStatus === 'active'
                        ? 'bg-red-50 border-l-red-500 ring-2 ring-red-200 shadow-lg'
                        : stepStatus === 'current'
                        ? 'bg-orange-50 border-l-orange-500 ring-2 ring-orange-200 shadow-md'
                        : getPriorityColor(step.priority)
                    }`}
                  >
                    {/* Step Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                          <div className="bg-white rounded-lg px-2 sm:px-3 py-1 shadow-sm border">
                            <span className="text-sm sm:text-lg font-bold text-stone-700">
                              {formatTime(step.startTime)} → {formatTime(step.startTime + step.duration)}
                            </span>
                          </div>
                          
                          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getStepTypeColor(step.type)}`}>
                            <div className="flex items-center gap-1">
                              {getStepTypeIcon(step.type)}
                              <span className="hidden sm:inline">{step.type.charAt(0).toUpperCase() + step.type.slice(1)}</span>
                            </div>
                          </div>
                          
                          <span className="bg-white px-2 py-1 rounded-lg text-xs sm:text-sm font-medium text-stone-600 border flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {formatTime(step.duration)}
                          </span>
                          
                          <span className="bg-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold text-stone-800 border truncate max-w-[120px] sm:max-w-none flex items-center gap-1">
                            <Dish className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{step.recipeName}</span>
                          </span>
                          
                          {/* Real-time Status Badge */}
                          {isTimerActive && timeInfo && (
                            <span className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded-full ${
                              stepStatus === 'active' ? 'bg-red-500 text-white' :
                              stepStatus === 'current' ? 'bg-orange-500 text-white' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {timeInfo}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-lg sm:text-xl font-bold text-stone-800 mb-3 leading-tight flex items-start gap-2">
                          <FileText className="w-5 h-5 mt-1 flex-shrink-0" />
                          {step.step}
                        </h3>
                        
                        {step.tips && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-blue-800 text-xs sm:text-sm leading-relaxed flex items-start gap-2">
                              <span className="text-blue-500 flex-shrink-0">💡</span>
                              <span><strong>Pro Tip:</strong> {step.tips}</span>
                            </p>
                          </div>
                        )}
                        
                        {step.equipment && step.equipment.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs sm:text-sm font-medium text-stone-600 mb-2">🔧 Equipment needed:</p>
                            <div className="flex flex-wrap gap-2">
                              {step.equipment.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 text-xs sm:text-sm rounded-full border"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {stepStatus === 'completed' ? (
                          <div className="flex items-center gap-2 text-green-600 w-full sm:w-auto justify-center sm:justify-start">
                            <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
                            <span className="font-bold text-sm sm:text-base">Done!</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => markStepComplete(step.id)}
                            className={`px-4 sm:px-6 py-3 text-sm font-bold rounded-xl transition-all w-full sm:w-auto min-h-[44px] ${
                              stepStatus === 'active' 
                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg' 
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                            }`}
                          >
                            ✅ <span className="hidden sm:inline">Mark </span>Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Timer Control */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 sm:p-4 -m-4 sm:-m-6 mt-6 sm:mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              {isTimerActive && (
                <div className="flex items-center gap-3 sm:gap-4 bg-blue-50 px-4 sm:px-6 py-3 rounded-xl border border-blue-200 w-full sm:w-auto">
                  <div className="text-center flex-1 sm:flex-initial">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:
                      {(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-blue-500 flex items-center gap-1 justify-center">
                      <Flame className="w-3 h-3" />
                      Cooking Time
                    </div>
                  </div>
                  
                  <div className="text-center flex-1 sm:flex-initial">
                    <div className="text-lg sm:text-xl font-bold text-stone-700">
                      {formatTime(Math.max(0, schedule.totalTime - Math.floor(elapsedSeconds / 60)))}
                    </div>
                    <div className="text-xs text-stone-500">⏰ Time Left</div>
                  </div>
                </div>
              )}
              
              <button
                onClick={startTimer}
                className={`flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg min-h-[52px] sm:min-h-[56px] ${
                  isTimerActive 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                }`}
              >
                {isTimerActive ? (
                  <>
                    <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden sm:inline">Pause Cooking</span>
                    <span className="sm:hidden">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden sm:inline">Start Cooking Timer</span>
                    <span className="sm:hidden">Start Timer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookingPath;
