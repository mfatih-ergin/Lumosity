import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Eye, Check, X, Delete, CornerDownLeft, Sparkles, Clock } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export type { DifficultyMode };

interface DigitFlashGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const DigitFlashGame: React.FC<DigitFlashGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
}) => {
  const { user, updateUserBpi } = useAuthStore();

  // Mode & Initialization state
  const [difficulty, setDifficulty] = useState<DifficultyMode | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState(false);

  // Game Progress State
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isTimeUpBanner, setIsTimeUpBanner] = useState(false);

  // Round State
  const [phase, setPhase] = useState<'READY' | 'FLASH' | 'INPUT' | 'FEEDBACK'>('READY');
  const [targetNumber, setTargetNumber] = useState<string>('1234');
  const [userInput, setUserInput] = useState<string>('');
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Performance Tracking with synchronous Refs to prevent stale closure bugs
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [finalMetrics, setFinalMetrics] = useState<any>(null);

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);
  const totalAttemptsRef = useRef(0);
  const correctAttemptsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const isGameOverRef = useRef(false);
  const isPausedRef = useRef(false);
  const pauseStartTimeRef = useRef(0);
  const difficultyRef = useRef<DifficultyMode>(isWorkoutStep ? 'MEDIUM' : 'MEDIUM');

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  // Generate random N-digit number
  const generateRandomDigits = (digitCount: number): string => {
    const min = Math.pow(10, digitCount - 1);
    const max = Math.pow(10, digitCount) - 1;
    const num = Math.floor(min + Math.random() * (max - min + 1));
    return num.toString();
  };

  // Determine digit count based on difficulty & level/round
  const getDigitCount = (mode: DifficultyMode, currentLevel: number): number => {
    if (mode === 'EASY') {
      // EASY: Max 2 or 3 digits (Level 1 / early: 2 digits, Level 2+: 3 digits)
      return currentLevel <= 1 ? 2 : 3;
    } else if (mode === 'HARD') {
      // HARD: Min 5 digits, rarely 6 digits (Level 1-2: 5 digits, Level 3+ or 30% chance: 6 digits)
      if (currentLevel >= 3 || Math.random() < 0.3) {
        return 6;
      }
      return 5;
    } else {
      // MEDIUM: Standard 4 digits
      return 4;
    }
  };

  // Calculate flash duration based on digit count and difficulty mode
  const getFlashDurationMs = (mode: DifficultyMode, digitCount: number, currentLevel: number): number => {
    // Base duration proportional to digit count
    let baseMs = digitCount * 450;
    if (mode === 'EASY') {
      baseMs += 200; // Extra generous
    } else if (mode === 'HARD') {
      baseMs += 100;
    }

    // Slightly decrease with level for progression challenge
    const levelAdjustment = (currentLevel - 1) * 60;
    return Math.max(900, baseMs - levelAdjustment);
  };

  // Start new round
  const startNewRound = useCallback((currentLevel: number, modeOverride?: DifficultyMode) => {
    if (isGameOverRef.current) return;
    const currentMode = modeOverride || difficultyRef.current;
    const digitCount = getDigitCount(currentMode, currentLevel);
    const num = generateRandomDigits(digitCount);

    setTargetNumber(num);
    setUserInput('');
    setFeedback(null);
    setPhase('READY');

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

    // Ready phase: 500ms -> Flash phase -> Input phase
    flashTimerRef.current = setTimeout(() => {
      setPhase('FLASH');
      sounds.playClick();

      const flashDurationMs = getFlashDurationMs(currentMode, num.length, currentLevel);

      flashTimerRef.current = setTimeout(() => {
        setPhase('INPUT');
        inputStartTimeRef.current = Date.now();
      }, flashDurationMs);
    }, 500);
  }, []);

  // Start game with selected difficulty
  const handleSelectDifficulty = (mode: DifficultyMode) => {
    setDifficulty(mode);
    difficultyRef.current = mode;
    setHasStarted(true);
    setIsGameOver(false);
    isGameOverRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    scoreRef.current = 0;
    levelRef.current = 1;
    comboRef.current = 0;
    totalAttemptsRef.current = 0;
    correctAttemptsRef.current = 0;
    reactionTimesRef.current = [];
    setScore(0);
    setLevel(1);
    setCombo(0);
    setTimeLeft(45);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setReactionTimes([]);
    setFinalMetrics(null);

    startNewRound(1, mode);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const finishGame = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsTimeUpBanner(true);

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
        : 900;

    let savedData: any = null;
    try {
      savedData = await gamesApi.saveSession({
        gameId: 'digit-flash',
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

    setTimeout(() => {
      setIsTimeUpBanner(false);
      setIsGameOver(true);
      setFinalMetrics({
        score: finalScore,
        accuracy,
        avgReactionMs: avgReaction,
        maxLevel: finalLevel,
        bpiEarned: savedData?.session?.bpiEarned || 650,
        bpiDelta: savedData?.bpiDelta || 0,
      });
    }, 2200);
  };

  finishGameRef.current = finishGame;

  const handlePauseToggle = (paused: boolean) => {
    setIsPaused(paused);
    isPausedRef.current = paused;
    if (paused) {
      pauseStartTimeRef.current = Date.now();
    } else if (pauseStartTimeRef.current > 0) {
      const pausedDuration = Date.now() - pauseStartTimeRef.current;
      inputStartTimeRef.current += pausedDuration;
      pauseStartTimeRef.current = 0;
    }
  };

  // Main 45-second Timer (pauses when modal active)
  useEffect(() => {
    if (!hasStarted || isGameOver || isTimeUpBanner || isPaused) return;
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
  }, [hasStarted, isGameOver, isPaused]);

  // Handle Input Digit Click/Type
  const handleDigitInput = useCallback((digit: string) => {
    if (phase !== 'INPUT' || isGameOverRef.current || isPausedRef.current) return;
    if (userInput.length >= targetNumber.length) return;

    sounds.playClick();
    const updated = userInput + digit;
    setUserInput(updated);

    if (updated.length === targetNumber.length) {
      validateSubmission(updated);
    }
  }, [phase, userInput, targetNumber.length]);

  // Handle Backspace
  const handleBackspace = useCallback(() => {
    if (phase !== 'INPUT' || isGameOverRef.current || isPausedRef.current) return;
    sounds.playClick();
    setUserInput((prev) => prev.slice(0, -1));
  }, [phase]);

  // Keyboard navigation
  useEffect(() => {
    if (!hasStarted || isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        e.preventDefault();
        handleDigitInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, isPaused, handleDigitInput, handleBackspace]);

  // Validate answer
  const validateSubmission = (submittedStr: string) => {
    const reaction = Date.now() - inputStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setReactionTimes([...reactionTimesRef.current]);
    setTotalAttempts(totalAttemptsRef.current);
    setPhase('FEEDBACK');

    const isCorrect = submittedStr === targetNumber;

    if (isCorrect) {
      sounds.playCorrect(comboRef.current);
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);
      setFeedback('CORRECT');

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      // Multiplier based on mode
      const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;

      // Speed bonus: faster response earns higher score
      const speedBonus = Math.max(0, Math.floor((2800 - reaction) / 15));
      const basePoints = 120 + newCombo * 25 + speedBonus;
      const points = Math.round(basePoints * multiplier);

      scoreRef.current += points;
      setScore(scoreRef.current);

      if (newCombo % 4 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }

      setTimeout(() => {
        if (!isGameOverRef.current) {
          startNewRound(levelRef.current);
        }
      }, 700);
    } else {
      sounds.playWrong();
      setFeedback('WRONG');
      comboRef.current = 0;
      setCombo(0);

      setTimeout(() => {
        if (!isGameOverRef.current) {
          startNewRound(levelRef.current);
        }
      }, 1200);
    }
  };

  // 1. Difficulty Mode Selection Screen (Before round begins)
  if (!hasStarted) {
    return (
      <DifficultySelectionScreen
        gameTitle="Digit Flash"
        category="İkonik Hafıza"
        description="Kart üzerindeki rakamları anlık olarak aklınızda tutun ve eksiksiz olarak girin."
        onSelectDifficulty={handleSelectDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Isınma ve hızlı basamaklı hafıza pratikleri için idealdir.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Max 2 veya 3', text: 'Basamaklı Sayılar' },
              { strong: 'Orantılı Flaş Süresi', text: '(1.1s - 1.5s)' },
              { text: 'Rahat ve anlaşılır hafıza kartları' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik 4 haneli ikonik hafıza testi.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: '4 Basamaklı', text: 'Standart Sayılar' },
              { strong: '1.8 Saniye', text: 'Flaş Görünme Süresi' },
              { text: 'Dengeli BPI ve Skor Kazancı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod (Dev Sayılar)',
            description: 'Maksimum odaklanma gerektiren 5-6 haneli dev sayılar!',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: '5 veya 6 Basamaklı', text: 'Zorlu Sayılar' },
              { strong: 'Orantılı Flaş Süresi', text: '(2.3s - 2.8s)' },
              { text: 'Maksimum BPI ve skor kazancı', highlight: true },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <>
            <strong className="text-white block mb-1">Digit Flash İpuçları:</strong>
            Ekranda parlayan sayıları tek tek okumak yerine, tüm kartı bir fotoğraf gibi (görsel hafıza) algılamaya çalışın.
          </>
        }
      />
    );
  }

  // 2. Active Game Surface
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none animate-fade-in text-black">
      <GameHeader
        title="Digit Flash"
        category="İkonik Hafıza"
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        level={level}
        onExit={onExit}
        onPauseToggle={handlePauseToggle}
      />

      {/* Game Center Stage */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-10 border-[2.5px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden">
        
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

        {/* Phase Notification Banner */}
        <div className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ffd43b] border-2 border-black text-xs font-mono font-black text-black shadow-[2px_2px_0px_0px_#000]">
          <Eye className="w-4 h-4 text-black animate-pulse stroke-[2.5]" />
          <span>
            {phase === 'READY' && 'DİKKATİNİ TOPLA...'}
            {phase === 'FLASH' && 'SAYIYI AKLINDA TUT!'}
            {phase === 'INPUT' && `${targetNumber.length} HANELİ SAYIYI GİRİN:`}
            {phase === 'FEEDBACK' && (feedback === 'CORRECT' ? 'HARİKA! DOĞRU CEVAP' : `YANLIŞ! DOĞRUSU: ${targetNumber}`)}
          </span>
        </div>

        {/* Paper Note Slip Container */}
        <div className="relative w-72 sm:w-88 h-36 sm:h-40 rounded-2xl bg-[#fffdf5] text-black shadow-[4px_4px_0px_0px_#000] flex flex-col items-center justify-center p-6 border-2 border-black transform -rotate-1 hover:rotate-0 transition-transform duration-300">
          
          {/* Paper Pin / Tape Visual Accent */}
          <div className="absolute -top-3 w-16 h-6 bg-[#fde047] rounded border border-black shadow-[1px_1px_0px_0px_#000]" />
          
          {/* Watermark / Note line */}
          <div className="w-full border-b-2 border-black mb-2 flex items-center justify-between text-[10px] text-neutral-700 font-mono font-bold">
            <span>HAFIZA KARTI</span>
            <span>{targetNumber.length} HANE</span>
          </div>

          {/* Flash Display Area */}
          <div className="flex-1 flex items-center justify-center">
            {phase === 'FLASH' ? (
              <div className="flex items-center gap-2 sm:gap-3 text-3xl sm:text-5xl font-black font-mono tracking-wider text-black animate-scale-in">
                {targetNumber.split('').map((char, i) => (
                  <span key={i} className="inline-block p-1 bg-[#ffd43b] rounded-lg border border-black shadow-[1px_1px_0px_0px_#000]">
                    {char}
                  </span>
                ))}
              </div>
            ) : phase === 'READY' ? (
              <div className="text-neutral-500 font-mono text-sm tracking-widest animate-pulse font-bold">
                {Array.from({ length: targetNumber.length }).map(() => '•').join(' ')}
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3 text-2xl sm:text-4xl font-mono text-neutral-400 font-bold">
                {Array.from({ length: targetNumber.length }).map((_, i) => (
                  <span key={i}>?</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Digit Boxes Display (Dynamically sizes for 2 to 6 digits) */}
        <div className="mt-8 flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          {Array.from({ length: targetNumber.length }).map((_, idx) => {
            const digit = userInput[idx];
            const isFilled = digit !== undefined;
            const isCurrent = userInput.length === idx && phase === 'INPUT';

            return (
              <div
                key={idx}
                className={`w-10 h-12 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-3xl font-black font-mono transition-all border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                  feedback === 'CORRECT'
                    ? 'bg-[#4ecdc4] text-black shadow-[3px_3px_0px_0px_#000]'
                    : feedback === 'WRONG'
                    ? 'bg-[#ff6b6b] text-black animate-shake shadow-[3px_3px_0px_0px_#000]'
                    : isCurrent
                    ? 'bg-[#ffd43b] text-black shadow-[3px_3px_0px_0px_#000] scale-105'
                    : isFilled
                    ? 'bg-white text-black'
                    : 'bg-[#fbf7ee] text-neutral-400'
                }`}
              >
                {digit || ''}
              </div>
            );
          })}
        </div>

        {/* On-Screen Touch Numpad */}
        <div className="mt-6 w-full max-w-xs grid grid-cols-3 gap-2 sm:gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigitInput(d)}
              disabled={phase !== 'INPUT' || isPaused}
              className="py-3 rounded-xl bg-white hover:bg-amber-100 border-2 border-black text-black font-mono font-black text-lg shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer"
            >
              {d}
            </button>
          ))}

          {/* Backspace Button */}
          <button
            onClick={handleBackspace}
            disabled={phase !== 'INPUT' || userInput.length === 0 || isPaused}
            className="py-3 rounded-xl bg-[#ffbe76] hover:bg-amber-300 border-2 border-black text-black font-mono font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer"
          >
            <Delete className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* 0 Button */}
          <button
            onClick={() => handleDigitInput('0')}
            disabled={phase !== 'INPUT' || isPaused}
            className="py-3 rounded-xl bg-white hover:bg-amber-100 border-2 border-black text-black font-mono font-black text-lg shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer"
          >
            0
          </button>

          {/* Submit / Enter Button */}
          <button
            onClick={() => {
              if (userInput.length === targetNumber.length) validateSubmission(userInput);
            }}
            disabled={phase !== 'INPUT' || userInput.length < targetNumber.length || isPaused}
            className="py-3 rounded-xl bg-[#4ecdc4] hover:bg-[#3db8af] border-2 border-black text-black font-mono font-black text-sm flex items-center justify-center shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
          </button>
        </div>

        <p className="mt-4 text-[11px] text-neutral-600 font-mono font-bold text-center">
          Klavyenizdeki <span className="text-black font-black">Rakamları (0-9)</span> veya tuş takımını kullanabilirsiniz.
        </p>
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
          category={`Hafıza (${difficulty === 'EASY' ? 'Kolay' : difficulty === 'HARD' ? 'Zor' : 'Orta'})`}
          onPlayAgain={() => {
            isGameOverRef.current = false;
            scoreRef.current = 0;
            levelRef.current = 1;
            comboRef.current = 0;
            totalAttemptsRef.current = 0;
            correctAttemptsRef.current = 0;
            reactionTimesRef.current = [];
            setFinalMetrics(null);
            setIsGameOver(false);
            setIsPaused(false);
            isPausedRef.current = false;
            setLevel(1);
            setScore(0);
            setCombo(0);
            setTimeLeft(45);
            setTotalAttempts(0);
            setCorrectAttempts(0);
            setReactionTimes([]);
            startNewRound(1, difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
