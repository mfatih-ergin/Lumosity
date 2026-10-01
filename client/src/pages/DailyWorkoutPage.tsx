import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Play, 
  Flame, 
  Award, 
  Sparkles, 
  Grid,
  Navigation,
  Zap,
  Target,
  Brain,
  FileText,
  Calculator,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { workoutApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { DailyWorkout } from '../types';
import { sounds } from '../services/soundEffects';

interface DailyWorkoutPageProps {
  onStartGame: (gameId: string, isWorkoutStep: boolean) => void;
}

export const DailyWorkoutPage: React.FC<DailyWorkoutPageProps> = ({ onStartGame }) => {
  const { user, setAuthModalOpen } = useAuthStore();
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkout = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await workoutApi.getDaily();
      setWorkout(data);
    } catch (err) {
      console.error('Failed to load workout:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkout();

    // Auto-refetch when local clock strikes 00:00 midnight
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      fetchWorkout();
    }, msUntilMidnight);

    return () => clearTimeout(timer);
  }, [user]);

  // Trigger celebration confetti when all workout games are completed
  const completedCount = workout?.games?.filter((g) => g.completed).length || 0;
  const totalCount = workout?.games?.length || 3;
  const isAllCompleted = completedCount === totalCount && completedCount > 0;

  useEffect(() => {
    if (isAllCompleted) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#ff6b6b', '#fde047', '#4ecdc4', '#a78bfa', '#000000'],
      });
    }
  }, [isAllCompleted]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in text-black">
        <div className="w-16 h-16 rounded-2xl bg-[#ffd43b] border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center mx-auto text-black">
          <Calendar className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-black tracking-tight">Günün Beyin Egzersizi</h2>
        <p className="text-sm font-bold text-neutral-700">
          Her gün 00.00'da sıfırlanan 3 farklı kategorideki rastgele özel antrenman rutinine katılın.
        </p>
        <button
          onClick={() => setAuthModalOpen(true, 'login')}
          className="neo-btn bg-[#ff6b6b] text-black px-8 py-3.5 shadow-[4px_4px_0px_0px_#000] text-sm hover:bg-[#fa5252]"
        >
          Giriş Yap ve Rutine Başla
        </button>
      </div>
    );
  }

  // Skeleton UI while loading workout from DB
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-in">
        <div className="text-center space-y-3 max-w-2xl mx-auto flex flex-col items-center">
          <div className="h-6 w-44 rounded-full bg-amber-100 skeleton-shimmer" />
          <div className="h-10 sm:h-12 w-3/4 rounded-2xl bg-amber-100 skeleton-shimmer mt-2" />
        </div>

        <div className="neo-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-44 rounded-lg bg-amber-100 skeleton-shimmer" />
            <div className="h-8 w-16 rounded-xl bg-amber-100 skeleton-shimmer" />
          </div>
          <div className="w-full h-5 rounded-full bg-amber-100 skeleton-shimmer mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-20 rounded-2xl bg-amber-100 skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStepIcon = (gameId: string) => {
    switch (gameId) {
      case 'spatial-matrix': return Grid;
      case 'digit-flash': return FileText;
      case 'lost-in-flight': return Navigation;
      case 'stroop-rush': return Zap;
      case 'rail-master': return Target;
      case 'flash-math': return Calculator;
      case 'cup-stack': return Layers;
      default: return Brain;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-in text-black">
      
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="neo-badge bg-[#ffd43b] text-black">
          <Flame className="w-4 h-4 fill-amber-400 text-black stroke-[2.5]" />
          <span>GÜNLÜK SERİ: {user.streakDays} GÜN</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
          Günün Beyin Egzersizi
        </h1>
        <p className="text-xs sm:text-sm font-bold text-neutral-700">
          Her gün saat 00.00'da sıfırlanan 3 farklı kategorideki rastgele oyunlarla beyninizin farklı loblarını çalıştırın.
        </p>
      </div>

      {/* Progress & Status Card (Neo-Brutalism style) */}
      <div className="neo-card p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000]">
        
        {/* Progress Bar & Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-black text-black">Bugünün İlerlemesi</h3>
            <span className="text-xs font-bold text-neutral-600">
              {isAllCompleted ? 'Tebrikler! Bugünün antrenmanını tamamladınız.' : `${totalCount - completedCount} egzersiz kaldı.`}
            </span>
          </div>
          <div className="text-right">
            <span className="neo-badge bg-[#ffd43b] text-base font-black font-mono">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        <div className="w-full h-5 rounded-full border-2 border-black bg-white overflow-hidden p-0.5 shadow-[2px_2px_0px_0px_#000] mb-8">
          <div
            className="h-full rounded-full bg-[#ff6b6b] border-r-2 border-black transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>

        {/* 3 Step Workout List */}
        <div className="space-y-4 mb-8">
          {workout?.games?.map((step, idx) => {
            const Icon = getStepIcon(step.gameId);
            return (
              <div
                key={step.gameId}
                className={`p-4 sm:p-5 rounded-2xl border-2 border-black transition-all flex items-center justify-between shadow-[3px_3px_0px_0px_#000] ${
                  step.completed
                    ? 'bg-[#4ecdc4]'
                    : 'bg-[#fffdf7] hover:bg-[#fff9ea] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_0px_#000]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0 ${
                    step.completed ? 'bg-white text-black' : 'bg-[#ffd43b] text-black'
                  }`}>
                    {step.completed ? <CheckCircle2 className="w-6 h-6 stroke-[2.5] text-black" /> : <Icon className="w-6 h-6 stroke-[2.5] text-black" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-mono font-black px-2.5 py-0.5 rounded-full bg-white text-black border border-black shadow-[1px_1px_0px_0px_#000]">
                        Aşama {idx + 1}: {step.phase}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-black">{step.title}</h4>
                    <p className={`text-xs font-bold hidden sm:block ${step.completed ? 'text-black' : 'text-neutral-700'}`}>{step.description}</p>
                  </div>
                </div>

                <div>
                  {step.completed ? (
                    <span className="neo-badge bg-white text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000]">
                      ✓ Tamamlandı
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        onStartGame(step.gameId, true);
                      }}
                      className="neo-btn bg-[#ff6b6b] hover:bg-[#fa5252] text-black text-xs px-5 py-2.5 shadow-[2.5px_2.5px_0px_0px_#000] flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Oyna</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main CTA when completed */}
        {isAllCompleted ? (
          <div className="p-5 rounded-2xl bg-[#ffd43b] border-2 border-black shadow-[3px_3px_0px_0px_#000] text-center">
            <Sparkles className="w-7 h-7 text-black mx-auto mb-1 stroke-[2.5]" />
            <h4 className="text-base font-black text-black">Bugünkü Beyin Rutini Başarıyla Tamamlandı!</h4>
            <p className="text-xs font-bold text-neutral-800 mt-1">Yarın yeni egzersizler ve seriyi artırmak için tekrar gelin.</p>
          </div>
        ) : (
          <div className="text-center text-xs font-bold text-neutral-600">
            Tüm egzersizleri sırayla tamamlayarak serinizi koruyun!
          </div>
        )}

      </div>
    </div>
  );
};
