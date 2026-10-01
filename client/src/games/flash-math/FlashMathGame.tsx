import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calculator, Eye, Check, Delete, Sparkles, Zap, Brain, ShieldCheck, Flame, Clock } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface MathProblem {
  expression: string;
  answer: number;
}

interface FlashMathGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const FlashMathGame: React.FC<FlashMathGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
}) => {
  const { user, updateUserBpi } = useAuthStore();

  // Difficulty Mode State
  const [mode, setMode] = useState<DifficultyMode | null>(null);

  // Game Progress State
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isTimeUpBanner, setIsTimeUpBanner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Round State
  const [phase, setPhase] = useState<'READY' | 'FLASH' | 'INPUT' | 'FEEDBACK'>('READY');
  const [currentProblem, setCurrentProblem] = useState<MathProblem>({ expression: '7 + 5', answer: 12 });
  const [userInput, setUserInput] = useState<string>('');
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Performance Tracking with synchronous Refs
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [finalMetrics, setFinalMetrics] = useState<any>(null);

  const modeRef = useRef<DifficultyMode>('MEDIUM');
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);
  const totalAttemptsRef = useRef(0);
  const correctAttemptsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const isGameOverRef = useRef(false);
  const isPausedRef = useRef(false);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  // Generate dynamic math problem based on selected mode & level
  const generateProblem = (lvl: number, selectedMode: DifficultyMode): MathProblem => {
    if (selectedMode === 'EASY') {
      // EASY: 1-digit numbers only (1..9), addition (+) and subtraction (-)
      const op = Math.random() < 0.5 ? '+' : '-';
      if (op === '+') {
        const a = Math.floor(1 + Math.random() * 9); // 1..9
        const b = Math.floor(1 + Math.random() * 9); // 1..9
        return { expression: `${a} + ${b}`, answer: a + b };
      } else {
        const a = Math.floor(3 + Math.random() * 7); // 3..9
        const b = Math.floor(1 + Math.random() * a); // 1..a
        return { expression: `${a} - ${b}`, answer: a - b };
      }
    }

    if (selectedMode === 'MEDIUM') {
      // MEDIUM: 2-digit numbers with addition (+) and subtraction (-)
      const op = Math.random() < 0.5 ? '+' : '-';
      if (op === '+') {
        const a = Math.floor(12 + Math.random() * 45); // 12..56
        const b = Math.floor(10 + Math.random() * 40); // 10..49
        return { expression: `${a} + ${b}`, answer: a + b };
      } else {
        const a = Math.floor(35 + Math.random() * 60); // 35..94
        const b = Math.floor(10 + Math.random() * (a - 10));
        return { expression: `${a} - ${b}`, answer: a - b };
      }
    }

    // HARD MODE: 3-digit numbers OR Multiplication (×) & Division (÷)
    const rand = Math.random();
    if (rand < 0.30) {
      // Multiplication: 4..15 × 4..12
      const a = Math.floor(4 + Math.random() * 12);
      const b = Math.floor(4 + Math.random() * 9);
      return { expression: `${a} × ${b}`, answer: a * b };
    } else if (rand < 0.60) {
      // Division: Clean integer division (e.g. 144 ÷ 12 = 12, 240 ÷ 6 = 40)
      const b = Math.floor(3 + Math.random() * 10);
      const result = Math.floor(6 + Math.random() * 20);
      const a = b * result;
      return { expression: `${a} ÷ ${b}`, answer: result };
    } else if (rand < 0.80) {
      // 3-digit Addition (e.g. 125 + 48)
      const a = Math.floor(100 + Math.random() * 250);
      const b = Math.floor(25 + Math.random() * 150);
      return { expression: `${a} + ${b}`, answer: a + b };
    } else {
      // 3-digit Subtraction (e.g. 250 - 75)
      const a = Math.floor(150 + Math.random() * 300);
      const b = Math.floor(25 + Math.random() * (a - 50));
      return { expression: `${a} - ${b}`, answer: a - b };
    }
  };

  // Start a new problem round
  const startNewRound = useCallback((lvl: number, selectedMode: DifficultyMode) => {
    if (isGameOverRef.current) return;
    const problem = generateProblem(lvl, selectedMode);
    setCurrentProblem(problem);
    setUserInput('');
    setFeedback(null);
    setPhase('READY');

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

    // Ready phase -> Flash problem -> Input phase
    flashTimerRef.current = setTimeout(() => {
      setPhase('FLASH');
      sounds.playClick();

      // Adaptive flash duration based on mode and level
      const baseDuration = selectedMode === 'EASY' ? 2500 : selectedMode === 'HARD' ? 2200 : 1800;
      const flashDuration = Math.max(1200, baseDuration - lvl * 150);

      flashTimerRef.current = setTimeout(() => {
        setPhase('INPUT');
        inputStartTimeRef.current = Date.now();
      }, flashDuration);
    }, 400);
  }, []);

  // Handle difficulty selection
  const handleSelectDifficulty = (selectedMode: DifficultyMode) => {
    setMode(selectedMode);
    modeRef.current = selectedMode;

    // Reset states
    setLevel(1);
    setScore(0);
    setCombo(0);
    setTimeLeft(45);
    setIsGameOver(false);
    setIsTimeUpBanner(false);
    setIsPaused(false);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setReactionTimes([]);
    setFinalMetrics(null);

    scoreRef.current = 0;
    levelRef.current = 1;
    comboRef.current = 0;
    totalAttemptsRef.current = 0;
    correctAttemptsRef.current = 0;
    reactionTimesRef.current = [];
    isGameOverRef.current = false;
    isPausedRef.current = false;

    startNewRound(1, selectedMode);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Finish Game logic with 2.2s Time's Up Banner Transition
  const finishGame = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsTimeUpBanner(true); // Show "SÜRE DOLDU!" transition banner

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

    const finalScore = scoreRef.current;
    const finalLevel = levelRef.current;
    const finalTotalAttempts = totalAttemptsRef.current;
    const finalCorrectAttempts = correctAttemptsRef.current;
    const finalReactionTimes = reactionTimesRef.current;

    const accuracy =
      finalTotalAttempts > 0
        ? finalCorrectAttempts / finalTotalAttempts
        : finalScore > 0
        ? 1.0
        : 0.5;

    const avgReaction =
      finalReactionTimes.length > 0
        ? Math.round(finalReactionTimes.reduce((a, b) => a + b, 0) / finalReactionTimes.length)
        : 1100;

    // Save session in background while transition banner plays
    let savedData: any = null;
    try {
      savedData = await gamesApi.saveSession({
        gameId: 'flash-math',
        score: finalScore,
        rawAccuracy: accuracy,
        avgReactionMs: avgReaction,
        maxLevel: finalLevel,
      });

      if (savedData && savedData.newOverallBpi && user) {
        updateUserBpi(savedData.newOverallBpi, savedData.user?.streakDays);
      }
    } catch (err) {
      console.error('Save session error:', err);
    }

    // After 2.2 seconds transition delay, hide banner and show GameOverModal
    setTimeout(() => {
      setIsTimeUpBanner(false);
      setIsGameOver(true);

      setFinalMetrics({
        score: finalScore,
        accuracy,
        avgReactionMs: avgReaction,
        maxLevel: finalLevel,
        bpiEarned: savedData?.session?.bpiEarned || Math.round(finalScore * 0.8),
        bpiDelta: savedData?.bpiDelta || 0,
      });
    }, 2200);
  };

  finishGameRef.current = finishGame;

  // Main 45-second Timer
  useEffect(() => {
    if (!mode || isGameOver || isTimeUpBanner || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGameRef.current();
          return 0;
        }
        if (prev <= 4) sounds.playCountdown(false);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, isGameOver, isTimeUpBanner, isPaused]);

  // Handle Input Digit Click/Type
  const handleDigitInput = useCallback((digit: string) => {
    if (phase !== 'INPUT' || isGameOverRef.current || isPausedRef.current) return;
    if (userInput.length >= 6) return;

    sounds.playClick();
    setUserInput((prev) => prev + digit);
  }, [phase, userInput]);

  // Handle Backspace
  const handleBackspace = useCallback(() => {
    if (phase !== 'INPUT' || isGameOverRef.current || isPausedRef.current) return;
    sounds.playClick();
    setUserInput((prev) => prev.slice(0, -1));
  }, [phase]);

  // Validate User Input
  const validateSubmission = useCallback((submittedStr: string) => {
    if (phase !== 'INPUT' || isGameOverRef.current || isPausedRef.current || submittedStr.trim() === '') return;

    const reaction = Date.now() - inputStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setReactionTimes([...reactionTimesRef.current]);
    setTotalAttempts(totalAttemptsRef.current);
    setPhase('FEEDBACK');

    const numAnswer = parseInt(submittedStr, 10);
    const isCorrect = numAnswer === currentProblem.answer;

    if (isCorrect) {
      sounds.playCorrect(comboRef.current);
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);
      setFeedback('CORRECT');

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      // Score Multiplier based on mode
      const mult = modeRef.current === 'HARD' ? 1.6 : modeRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const speedBonus = Math.max(0, Math.floor((3000 - reaction) / 20));
      const points = Math.round((150 + newCombo * 30 + speedBonus) * mult);
      scoreRef.current += points;
      setScore(scoreRef.current);

      if (newCombo % 4 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }

      setTimeout(() => {
        if (!isGameOverRef.current) {
          startNewRound(levelRef.current, modeRef.current);
        }
      }, 700);
    } else {
      sounds.playWrong();
      setFeedback('WRONG');
      comboRef.current = 0;
      setCombo(0);

      setTimeout(() => {
        if (!isGameOverRef.current) {
          startNewRound(levelRef.current, modeRef.current);
        }
      }, 1400);
    }
  }, [phase, currentProblem.answer, startNewRound]);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mode || isGameOver || isTimeUpBanner || isPaused) return;

      if (/^[0-9]$/.test(e.key)) {
        handleDigitInput(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (userInput !== '') {
          validateSubmission(userInput);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isGameOver, isTimeUpBanner, isPaused, userInput, handleDigitInput, handleBackspace, validateSubmission]);

  // Difficulty selection options definition
  const difficultyOptions = {
    EASY: {
      title: 'Kolay Mod',
      description: 'Tek basamaklı sayılarla temel aritmetik işlemler.',
      multiplierBadge: '1.0x Puan',
      icon: ShieldCheck,
      features: [
        { strong: 'Basamak Sayısı:', text: '1 basamaklı sayılar (örn: 7 + 5, 9 - 4)' },
        { strong: 'İşlemler:', text: 'Toplama (+) ve Çıkarma (-)' },
        { strong: 'Gösterim:', text: 'Rahat ve cömert görme süresi' },
      ],
      buttonText: 'Kolay Modda Başla',
    },
    MEDIUM: {
      title: 'Orta Mod (Klasik)',
      description: '2 basamaklı sayılarla zihinsel toplama ve çıkarma.',
      multiplierBadge: '1.25x Puan',
      badgeExtra: 'ÖNERİLEN',
      icon: Zap,
      features: [
        { strong: 'Basamak Sayısı:', text: '2 basamaklı sayılar (örn: 45 + 23, 86 - 34)', highlight: true },
        { strong: 'İşlemler:', text: 'Toplama (+) ve Çıkarma (-)' },
        { strong: 'Gösterim:', text: 'Dengeli flaş süresi' },
      ],
      buttonText: 'Orta Modda Başla',
    },
    HARD: {
      title: 'Zor Mod (3 Basamak & Çarpma/Bölme)',
      description: '3 basamaklı sayılar, Çarpma (×) ve Bölme (÷) işlemleri!',
      multiplierBadge: '1.6x Puan',
      icon: Flame,
      features: [
        { strong: 'İşlemler:', text: 'Çarpma (×) ve Bölme (÷) eklendi', highlight: true },
        { strong: 'Basamak Sayısı:', text: '3 basamaklı sayılar (örn: 125 + 48, 144 ÷ 12)', highlight: true },
        { strong: 'Tempo:', text: 'Yüksek odaklanma gerektiren tempolu flaş' },
      ],
      buttonText: 'Zor Modda Başla',
    },
  };

  // Render Difficulty Selection Screen if mode not chosen yet
  if (!mode) {
    return (
      <DifficultySelectionScreen
        gameTitle="Flash Math (Flaş Matematik)"
        category="LOGIC & ARITHMETIC"
        description="Ekranda anlık beliren matematik işlemini aklında hesapla ve doğru cevabı şimşek hızında gir!"
        onSelectDifficulty={handleSelectDifficulty}
        onExit={onExit}
        options={difficultyOptions}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 select-none animate-fade-in">
      
      {/* Standard Header */}
      <GameHeader
        title="Flash Math"
        category="LOGIC & ARITHMETIC"
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        level={level}
        onExit={onExit}
        onPauseToggle={(p) => setIsPaused(p)}
      />

      {/* Main Flash Math Playing Board */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-[2.5px] border-black relative overflow-hidden flex flex-col items-center justify-between min-h-[460px] shadow-[6px_6px_0px_0px_#000] text-black">
        
        {/* Mode Pill */}
        <div className="w-full flex items-center justify-between mb-2">
          <span className="neo-badge bg-[#fde047] text-black">
            MOD: {mode} ({mode === 'HARD' ? '1.6x' : mode === 'MEDIUM' ? '1.25x' : '1.0x'})
          </span>

          {combo > 1 && (
            <span className="neo-badge bg-[#ffd43b] text-black animate-bounce">
              ⚡ {combo} SERİ KOMBO
            </span>
          )}
        </div>

        {/* 2-Second Time's Up Banner Overlay */}
        {isTimeUpBanner && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-fade-in text-black">
            <div className="w-20 h-20 rounded-2xl bg-[#ff6b6b] border-[2.5px] border-black flex items-center justify-center text-black shadow-[4px_4px_0px_0px_#000]">
              <Clock className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
              ⏱️ SÜRE DOLDU!
            </h2>
            <p className="text-xs sm:text-sm font-bold text-amber-200 font-mono">
              Sonuçlar ve NeuroIndex puanı hesaplanıyor...
            </p>
          </div>
        )}

        {/* Problem Display Card */}
        <div className="w-full max-w-md my-auto text-center space-y-6">
          <div className="relative p-8 rounded-3xl bg-[#fffdf5] border-2 border-black shadow-[4px_4px_0px_0px_#000] min-h-[160px] flex items-center justify-center text-black">
            
            {phase === 'READY' && (
              <div className="flex items-center gap-2 text-black text-lg font-mono font-black animate-pulse">
                <Brain className="w-6 h-6 animate-spin stroke-[2.5]" />
                <span>HAZIRLAN...</span>
              </div>
            )}

            {phase === 'FLASH' && (
              <div className="text-4xl sm:text-6xl font-black text-black tracking-wider font-mono animate-scale-up">
                {currentProblem.expression}
              </div>
            )}

            {(phase === 'INPUT' || phase === 'FEEDBACK') && (
              <div className="space-y-2">
                <div className="text-xs text-neutral-600 font-mono font-bold uppercase tracking-widest">
                  İşlem Sonucunu Girin
                </div>
                <div className={`text-4xl sm:text-5xl font-black font-mono tracking-widest px-6 py-2 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                  feedback === 'CORRECT'
                    ? 'bg-[#4ecdc4] text-black'
                    : feedback === 'WRONG'
                    ? 'bg-[#ff6b6b] text-black'
                    : 'bg-white text-black'
                }`}>
                  {userInput || <span className="text-neutral-400 animate-pulse">_</span>}
                </div>
              </div>
            )}

          </div>

          {/* Keypad Input for Mouse/Touch */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto pt-2">
            {['1','2','3','4','5','6','7','8','9','C','0','✓'].map((key) => {
              if (key === 'C') {
                return (
                  <button
                    key={key}
                    onClick={handleBackspace}
                    disabled={phase !== 'INPUT' || isPaused}
                    className="p-3.5 rounded-2xl bg-[#ffbe76] hover:bg-amber-300 border-2 border-black text-black font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-30"
                  >
                    <Delete className="w-5 h-5 stroke-[2.5]" />
                  </button>
                );
              }
              if (key === '✓') {
                return (
                  <button
                    key={key}
                    onClick={() => validateSubmission(userInput)}
                    disabled={phase !== 'INPUT' || userInput === '' || isPaused}
                    className="p-3.5 rounded-2xl bg-[#4ecdc4] hover:bg-[#3db8af] border-2 border-black text-black font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-30"
                  >
                    <Check className="w-5 h-5 stroke-[3]" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  onClick={() => handleDigitInput(key)}
                  disabled={phase !== 'INPUT' || isPaused}
                  className="p-3.5 rounded-2xl bg-white hover:bg-amber-100 border-2 border-black text-black font-black text-lg shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-30"
                >
                  {key}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* Game Over Modal */}
      {isGameOver && finalMetrics && (
        <GameOverModal
          score={finalMetrics.score}
          accuracy={finalMetrics.accuracy}
          avgReactionMs={finalMetrics.avgReactionMs}
          maxLevel={finalMetrics.maxLevel}
          bpiEarned={finalMetrics.bpiEarned}
          bpiDelta={finalMetrics.bpiDelta}
          category="LOGIC"
          onPlayAgain={() => setMode(null)}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}

    </div>
  );
};

export default FlashMathGame;
