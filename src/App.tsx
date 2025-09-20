
import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/pages/HomePage';
import FavoritesPage from './components/pages/FavoritesPage';
import ReinventionPage from './components/pages/ReinventionPage';
import Header from './components/ui/Header';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import appwriteService from './services/appwriteService';
import { type RecipeWithImage } from './types';

const AppContent: React.FC = () => {
  const [savedRecipes, setSavedRecipes] = useState<RecipeWithImage[]>([]);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Load favorite recipes when user logs in
  useEffect(() => {
    if (user) {
      loadFavoriteRecipes();
    } else {
      setSavedRecipes([]);
    }
  }, [user]);

  const loadFavoriteRecipes = async () => {
    if (!user) return;
    
    try {
      const favorites = await appwriteService.getFavoriteRecipes(user.$id);
      setSavedRecipes(favorites);
    } catch (error) {
      console.error('Failed to load favorite recipes:', error);
      showNotification('error', `Failed to load favorites: ${error.message || 'Please try again.'}`);
    }
  };

  const handleSaveRecipe = useCallback(async (recipe: RecipeWithImage) => {
    if (!user) {
      // If user is not logged in, handle locally (temporary)
      setSavedRecipes(prev => {
        const isAlreadySaved = prev.find(r => r.recipeName === recipe.recipeName);
        if (isAlreadySaved) {
          showNotification('success', 'Recipe removed from favorites');
          return prev.filter(r => r.recipeName !== recipe.recipeName);
        } else {
          showNotification('success', 'Recipe saved to favorites');
          return [...prev, recipe];
        }
      });
      return;
    }

    try {
      const existingFavorite = await appwriteService.findFavoriteRecipe(recipe.recipeName, user.$id);
      
      if (existingFavorite) {
        // Remove from favorites
        await appwriteService.removeFavoriteRecipe(existingFavorite.$id);
        setSavedRecipes(prev => prev.filter(r => r.recipeName !== recipe.recipeName));
        showNotification('success', 'Recipe removed from favorites');
      } else {
        // Add to favorites
        await appwriteService.saveFavoriteRecipe(recipe, user.$id);
        setSavedRecipes(prev => [...prev, recipe]);
        showNotification('success', 'Recipe saved to favorites');
      }
    } catch (error) {
      console.error('Failed to save/remove favorite recipe:', error);
      showNotification('error', `Failed to update favorites: ${error.message || 'Please try again.'}`);
      // Fallback to local storage
      setSavedRecipes(prev => {
        if (prev.find(r => r.recipeName === recipe.recipeName)) {
          return prev.filter(r => r.recipeName !== recipe.recipeName);
        } else {
          return [...prev, recipe];
        }
      });
    }
  }, [user, showNotification]);

  const isRecipeSaved = useCallback((recipeName: string) => {
    return savedRecipes.some(r => r.recipeName === recipeName);
  }, [savedRecipes]);

  return (
    <div className="min-h-screen bg-amber-50 safe-area-top safe-area-bottom">
      <Header savedCount={savedRecipes.length} />
      <main className="p-3 sm:p-4 md:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<HomePage onSaveRecipe={handleSaveRecipe} isRecipeSaved={isRecipeSaved} />} />
          <Route path="/reinvent" element={<ReinventionPage onSaveRecipe={handleSaveRecipe} isRecipeSaved={isRecipeSaved} />} />
          <Route path="/favorites" element={<FavoritesPage savedRecipes={savedRecipes} onSaveRecipe={handleSaveRecipe} isRecipeSaved={isRecipeSaved} />} />
        </Routes>
      </main>
      <footer className="text-center p-3 sm:p-4 text-stone-500 text-xs sm:text-sm">
        <p>&copy; 2025 CookiFy. All rights reserved.</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
