import React, { useState, useEffect } from 'react';
import { Recipe, CookingSchedule } from '../../types';
import { generateCookingSchedule } from '../../services/geminiService';
import Spinner from '../ui/Spinner';
import { Clock, AlertCircle, Play, Pause, Dish, ChefHat, Sparkles } from '../ui/Icons';

interface CookingPathProps {
  selectedRecipes: Recipe[];
  onBack: () => void;
}

const CookingPath: React.FC<CookingPathProps> = ({ selectedRecipes, onBack }) => {
  // Add safety check for selectedRecipes
  if (!selectedRecipes || selectedRecipes.length === 0) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-red-600 text-xl font-bold mb-4">No recipes selected</div>
          <p className="text-gray-600 mb-6">Please select some recipes before accessing the cooking path.</p>
          <button
            onClick={onBack}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  const [schedule, setSchedule] = useState<CookingSchedule | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [servingTime, setServingTime] = useState<string>('');
  const [equipment, setEquipment] = useState<string>('');
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && schedule) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, schedule]);

  const generateSchedule = async () => {
    console.log('Generating cooking schedule for recipes:', selectedRecipes);
    setIsGenerating(true);
    setError(null);
    
    try {
      const cookingRequest = {
        recipes: selectedRecipes,
        preferredServingTime: servingTime || undefined,
        kitchenEquipment: equipment ? equipment.split(',').map(e => e.trim()) : undefined,
        skillLevel
      };
      
      console.log('Sending cooking request:', cookingRequest);
      const generatedSchedule = await generateCookingSchedule(cookingRequest);
      console.log('Generated schedule:', generatedSchedule);
      setSchedule(generatedSchedule);
    } catch (err) {
      console.error('Error generating cooking schedule:', err);
      setError('Failed to generate cooking schedule. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startTimer = () => {
    setIsTimerActive(!isTimerActive);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (!schedule) {
    return (
      <div className="container mx-auto max-w-5xl p-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Clock className="w-8 h-8" />
                  Smart Cooking Scheduler
                </h1>
                <p className="opacity-90">Create an optimized cooking timeline for multiple dishes</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Selected Recipes */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                <Dish className="w-6 h-6" />
                Selected Recipes ({selectedRecipes.length})
              </h2>
              
              <div className="grid gap-4">
                {selectedRecipes.map((recipe, index) => (
                  <div key={index} className="flex items-center gap-4 p-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-stone-800 text-lg">{recipe.recipeName}</h3>
                      <div className="flex items-center gap-4 text-stone-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {recipe.cookingTime}
                        </span>
                        <span>{recipe.difficulty}</span>
                        <span>{recipe.servingSize || 'Serves 2-4'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <label className="block text-lg font-bold text-stone-800 mb-3 flex items-center gap-2">
                  <ChefHat className="w-5 h-5" />
                  Your Cooking Experience
                </label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as any)}
                  className="w-full p-4 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 text-lg font-medium"
                >
                  <option value="Beginner">Beginner - Detailed step-by-step guidance</option>
                  <option value="Intermediate">Intermediate - Some multitasking ability</option>
                  <option value="Advanced">Advanced - Complex timing coordination</option>
                </select>
              </div>
              
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <label className="block text-lg font-bold text-stone-800 mb-3">
                  ⏰ Target Serving Time (Optional)
                </label>
                <input
                  type="time"
                  value={servingTime}
                  onChange={(e) => setServingTime(e.target.value)}
                  className="w-full p-4 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 text-lg font-medium"
                />
              </div>
            </div>

            <div className="mb-8 bg-green-50 p-6 rounded-xl border border-green-200">
              <label className="block text-lg font-bold text-stone-800 mb-3">
                🔧 Available Kitchen Equipment (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., food processor, stand mixer, instant pot, air fryer"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full p-4 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-400"
              />
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border-2 border-red-400 text-red-700 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={generateSchedule}
                disabled={isGenerating || selectedRecipes.length === 0}
                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-6 px-12 rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:scale-100 text-xl flex items-center gap-4 mx-auto"
              >
                {isGenerating ? (
                  <>
                    <Spinner />
                    Generating Your Smart Cooking Schedule...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-8 h-8" />
                    Generate Cooking Schedule
                  </>
                )}
              </button>
              <p className="text-stone-600 mt-4 text-lg">
                Our AI will create a perfectly timed cooking sequence for all your recipes
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Clock className="w-8 h-8" />
                  Smart Cooking Schedule
                </h1>
                <p className="opacity-90">
                  Total Time: {formatTime(schedule.totalTime)} | {selectedRecipes.length} Recipe{selectedRecipes.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setSchedule(null)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Regenerate
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Timeline Summary */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
            <h2 className="text-xl font-bold text-stone-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Cooking Strategy & Flow
            </h2>
            <p className="text-stone-700 leading-relaxed mb-4 text-lg">{schedule.timelineSummary}</p>
            
            {/* Timer Display */}
            {isTimerActive && (
              <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:
                      {(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-sm text-blue-500">Elapsed Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-stone-700">
                      {formatTime(Math.max(0, schedule.totalTime - Math.floor(elapsedSeconds / 60)))}
                    </div>
                    <div className="text-sm text-stone-500">Remaining</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Professional Kitchen Tips */}
          <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Professional Kitchen Tips
            </h2>
            <div className="grid lg:grid-cols-2 gap-4">
              {schedule.efficiencyTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 bg-white p-4 rounded-lg border border-green-100">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Timeline */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
              <Dish className="w-6 h-6" />
              Step-by-Step Timeline
            </h2>
            
            <div className="space-y-4">
              {schedule.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="p-6 border-l-4 border-l-blue-500 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-white rounded-lg px-3 py-1 text-lg font-bold text-stone-700 border">
                          {formatTime(step.startTime)} → {formatTime(step.startTime + step.duration)}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                          {step.type}
                        </span>
                        <span className="bg-white px-3 py-1 rounded-lg text-sm font-medium text-stone-600 border">
                          {formatTime(step.duration)}
                        </span>
                        <span className="bg-white px-3 py-1 rounded-lg text-sm font-bold text-stone-800 border">
                          {step.recipeName}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-stone-800 mb-3">{step.step}</h3>
                      
                      {step.tips && (
                        <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-blue-800 text-sm">
                            <strong>💡 Pro Tip:</strong> {step.tips}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <button className="bg-green-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-green-700 transition-all">
                      ✅ Mark Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timer Control */}
          <div className="text-center bg-gray-50 p-6 rounded-xl">
            <button
              onClick={startTimer}
              className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg mx-auto ${
                isTimerActive 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              {isTimerActive ? (
                <>
                  <Pause className="w-6 h-6" />
                  Pause Cooking Timer
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Start Cooking Timer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookingPath;