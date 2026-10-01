import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { Dashboard } from './pages/Dashboard';
import { GamesCatalog } from './pages/GamesCatalog';
import { NeuroAnalytics } from './pages/NeuroAnalytics';
import { DailyWorkoutPage } from './pages/DailyWorkoutPage';
import { ProfilePage } from './pages/ProfilePage';
import { TrainingReminderToast } from './components/common/TrainingReminderToast';

import { SpatialMatrixGame } from './games/spatial-matrix/SpatialMatrixGame';
import { LostInFlightGame } from './games/lost-in-flight/LostInFlightGame';
import { StroopRushGame } from './games/stroop-rush/StroopRushGame';
import { RailMasterGame } from './games/rail-master/RailMasterGame';
import { DigitFlashGame } from './games/digit-flash/DigitFlashGame';
import { FlashMathGame } from './games/flash-math/FlashMathGame';
import { CupStackGame } from './games/cup-stack/CupStackGame';
import { NumberCompareGame } from './games/number-compare/NumberCompareGame';
import { SpeedMatchGame } from './games/speed-match/SpeedMatchGame';
import { RuleSwitchGame } from './games/rule-switch/RuleSwitchGame';
import { StarSearchGame } from './games/star-search/StarSearchGame';
import { MemoryMatchGame } from './games/memory-match/MemoryMatchGame';
import { WordBubblesGame } from './games/word-bubbles/WordBubblesGame';
import { CognitiveUniversalGame } from './games/cognitive-universal/CognitiveUniversalGame';
import { ALL_GAMES_METADATA } from './constants/gamesData';

import { useAuthStore } from './store/authStore';
import { workoutApi } from './services/api';
import { applyThemeToBody } from './utils/theme';

export const App: React.FC = () => {
  const { fetchProfile, user } = useAuthStore();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isWorkoutSession, setIsWorkoutSession] = useState<boolean>(false);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('ALL');

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const currentTheme = (typeof window !== 'undefined' && localStorage.getItem('neuro_theme')) || user?.settings?.theme || 'LIGHT_WHITE';
  const isDark = currentTheme === 'DARK' || currentTheme === 'DARK_BLACK';

  useEffect(() => {
    applyThemeToBody(currentTheme);
  }, [currentTheme]);

  const handleNavigate = (tab: string, categoryId?: string) => {
    setActiveGameId(null);
    if (tab === 'games' && categoryId) {
      setSelectedCatalogCategory(categoryId);
    }
    setCurrentTab(tab);
  };

  const handlePlayGame = (gameId: string, isWorkout: boolean = false) => {
    setActiveGameId(gameId);
    setIsWorkoutSession(isWorkout);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExitGame = () => {
    setActiveGameId(null);
    setIsWorkoutSession(false);
  };

  const handleNextWorkoutStep = async () => {
    if (activeGameId && user) {
      try {
        const res = await workoutApi.completeStep(activeGameId);
        const nextGame = res.workout.games?.find((g) => !g.completed);

        if (nextGame) {
          setActiveGameId(nextGame.gameId);
        } else {
          setActiveGameId(null);
          setCurrentTab('workout');
        }
      } catch {
        setActiveGameId(null);
        setCurrentTab('workout');
      }
    } else {
      setActiveGameId(null);
    }
  };

  const renderActiveGame = () => {
    switch (activeGameId) {
      case 'spatial-matrix':
        return (
          <SpatialMatrixGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'lost-in-flight':
        return (
          <LostInFlightGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'stroop-rush':
        return (
          <StroopRushGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'digit-flash':
        return (
          <DigitFlashGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'rail-master':
        return (
          <RailMasterGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'flash-math':
        return (
          <FlashMathGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'cup-stack':
        return (
          <CupStackGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'number-compare':
        return (
          <NumberCompareGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'speed-match':
        return (
          <SpeedMatchGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'rule-switch':
        return (
          <RuleSwitchGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'star-search':
        return (
          <StarSearchGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'memory-match':
        return (
          <MemoryMatchGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      case 'word-bubbles':
        return (
          <WordBubblesGame
            onExit={handleExitGame}
            isWorkoutStep={isWorkoutSession}
            onNextWorkoutStep={handleNextWorkoutStep}
          />
        );
      default: {
        const found = ALL_GAMES_METADATA.find((g) => g.id === activeGameId);
        if (found) {
          return (
            <CognitiveUniversalGame
              gameId={found.id}
              gameTitle={found.title}
              category={found.category}
              description={found.description}
              onExit={handleExitGame}
              isWorkoutStep={isWorkoutSession}
              onNextWorkoutStep={handleNextWorkoutStep}
            />
          );
        }
        return null;
      }
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#121212] text-white' : 'bg-[#fbf7ee] text-black'}`}>
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => handleNavigate(tab)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pb-12">
        {activeGameId ? (
          renderActiveGame()
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                onNavigate={handleNavigate}
                onPlayGame={(gameId) => handlePlayGame(gameId, false)}
              />
            )}
            {currentTab === 'workout' && (
              <DailyWorkoutPage
                onStartGame={(gameId, isWorkout) => handlePlayGame(gameId, isWorkout)}
              />
            )}
            {currentTab === 'games' && (
              <GamesCatalog
                onPlayGame={(gameId) => handlePlayGame(gameId, false)}
                initialCategory={selectedCatalogCategory}
              />
            )}
            {currentTab === 'analytics' && <NeuroAnalytics />}
            {currentTab === 'profile' && <ProfilePage onNavigate={handleNavigate} />}
          </>
        )}
      </main>

      {/* Global Auth Modal */}
      <AuthModal />

      {/* Smart Training Reminder Toast */}
      <TrainingReminderToast onNavigate={(tab) => setCurrentTab(tab)} />

      {/* Footer */}
      <Footer />
    </div>
  );
};
export default App;
