import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layers, Timer, RotateCcw, Undo2, ArrowUp, AlertTriangle, Clock } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export type { DifficultyMode };

interface CupColor {
  id: string;
  name: string;
  hex: string;
  gradient: string;
  borderHex: string;
  shadow: string;
}

const CUP_PALETTE: CupColor[] = [
  { id: 'red', name: 'Kırmızı', hex: '#ef4444', gradient: 'from-red-500 to-rose-600', borderHex: '#fca5a5', shadow: 'rgba(239, 68, 68, 0.4)' },
  { id: 'blue', name: 'Mavi', hex: '#3b82f6', gradient: 'from-blue-500 to-indigo-600', borderHex: '#93c5fd', shadow: 'rgba(59, 130, 246, 0.4)' },
  { id: 'green', name: 'Yeşil', hex: '#10b981', gradient: 'from-emerald-500 to-teal-600', borderHex: '#6ee7b7', shadow: 'rgba(168, 185, 129, 0.4)' },
  { id: 'yellow', name: 'Sarı', hex: '#f59e0b', gradient: 'from-amber-400 to-orange-500', borderHex: '#fde68a', shadow: 'rgba(245, 158, 11, 0.4)' },
  { id: 'purple', name: 'Mor', hex: '#a855f7', gradient: 'from-purple-500 to-fuchsia-600', borderHex: '#d8b4fe', shadow: 'rgba(168, 85, 247, 0.4)' },
  { id: 'orange', name: 'Turuncu', hex: '#f97316', gradient: 'from-orange-500 to-amber-600', borderHex: '#fdba74', shadow: 'rgba(249, 115, 22, 0.4)' },
];

const TOTAL_QUESTIONS = 8; // 8 Tur/Soru ile tamamlanan egzersiz

interface CupStackGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const CupStackGame: React.FC<CupStackGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
}) => {
  const { user, updateUserBpi } = useAuthStore();

  // Mode & Initialization state
  const [difficulty, setDifficulty] = useState<DifficultyMode | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState(false);

  // Progress & Scoring State
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isTimeUpBanner, setIsTimeUpBanner] = useState(false);
  const [questionResults, setQuestionResults] = useState<Array<'CORRECT' | 'WRONG' | null>>([]);

  // Round Flow State
  // 'MEMORIZE' (Target Card visible) -> 'SLIDING_OUT' -> 'STACKING' (player turn) -> 'FEEDBACK'
  const [phase, setPhase] = useState<'MEMORIZE' | 'SLIDING_OUT' | 'STACKING' | 'FEEDBACK'>('MEMORIZE');
  const [targetSequence, setTargetSequence] = useState<CupColor[]>([]); // Bottom to Top
  const [userStack, setUserStack] = useState<CupColor[]>([]); // Bottom to Top
  const [roundTimeLeft, setRoundTimeLeft] = useState(10);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | 'TIMEOUT' | null>(null);

  // Performance Metrics with synchronous Refs to prevent stale closure bugs
  const [successfulRounds, setSuccessfulRounds] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [finalMetrics, setFinalMetrics] = useState<any>(null);

  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const comboRef = useRef(0);
  const successfulRoundsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const isGameOverRef = useRef(false);
  const isPausedRef = useRef(false);
  const difficultyRef = useRef<DifficultyMode>(isWorkoutStep ? 'MEDIUM' : 'MEDIUM');

  const roundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memorizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  // Helper to get active palette based on difficulty
  const getActivePalette = (mode: DifficultyMode): CupColor[] => {
    switch (mode) {
      case 'EASY':
        return CUP_PALETTE.slice(0, 3); // 3 Colors: Red, Blue, Green
      case 'MEDIUM':
      case 'HARD':
      default:
        return CUP_PALETTE.slice(0, 5); // 5 Colors: Red, Blue, Green, Yellow, Purple
    }
  };

  // Helper to get placement time limit per mode
  const getMaxPlacementTime = (mode: DifficultyMode): number => {
    switch (mode) {
      case 'EASY': return 14;
      case 'MEDIUM': return 10;
      case 'HARD': return 8;
    }
  };

  // Generate a random cup sequence based on difficulty mode, question number & level
  const generateNewSequence = useCallback((qNum: number, currentLevel: number, modeOverride?: DifficultyMode) => {
    const currentMode = modeOverride || difficultyRef.current;
    const palette = getActivePalette(currentMode);

    // Dynamic cup count based on difficulty mode:
    // EASY: max 2 or 3 cups (Q1-4: 2 cups, Q5-8: 3 cups)
    // MEDIUM: mostly 3 or 4 cups, rarely 5 (Q1-2: 3 cups, Q3-6: 4 cups, Q7-8: 4 or 5 cups)
    // HARD: 4 or 5 cups (Q1-3: 4 cups, Q4-8: 5 cups)
    let cupCount = 3;

    if (currentMode === 'EASY') {
      cupCount = qNum <= 4 ? 2 : 3;
    } else if (currentMode === 'MEDIUM') {
      if (qNum <= 2) {
        cupCount = 3;
      } else if (qNum <= 6) {
        cupCount = 4;
      } else {
        cupCount = currentLevel >= 3 || Math.random() < 0.4 ? 5 : 4;
      }
    } else if (currentMode === 'HARD') {
      cupCount = qNum <= 3 ? 4 : 5;
    }

    // Pick unique cups from the active palette
    const shuffled = [...palette].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, cupCount);

    const maxTime = getMaxPlacementTime(currentMode);

    setTargetSequence(selected);
    setUserStack([]);
    setFeedback(null);
    setPhase('MEMORIZE');
    setRoundTimeLeft(maxTime);

    // Memorization time adapted to mode:
    // EASY: +%35 more generous (1500 + cupCount * 450ms)
    // MEDIUM: standard (1200 + cupCount * 350ms)
    // HARD: fast tempo (950 + cupCount * 280ms)
    let memorizeDurationMs = 1200 + cupCount * 350;
    if (currentMode === 'EASY') {
      memorizeDurationMs = 1500 + cupCount * 450;
    } else if (currentMode === 'HARD') {
      memorizeDurationMs = 950 + cupCount * 280;
    }

    if (memorizeTimerRef.current) clearTimeout(memorizeTimerRef.current);
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);

    memorizeTimerRef.current = setTimeout(() => {
      setPhase('SLIDING_OUT');
      sounds.playClick();

      setTimeout(() => {
        setPhase('STACKING');
        roundStartTimeRef.current = Date.now();

        // Start active placement countdown
        roundTimerRef.current = setInterval(() => {
          if (isPausedRef.current) return;
          setRoundTimeLeft((prev) => {
            if (prev <= 1) {
              if (roundTimerRef.current) clearInterval(roundTimerRef.current);
              handleRoundTimeout();
              return 0;
            }
            if (prev <= 3) sounds.playCountdown(false);
            return prev - 1;
          });
        }, 1000);
      }, 500);
    }, memorizeDurationMs);
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
    setCurrentQuestion(1);
    setLevel(1);
    setScore(0);
    setCombo(0);
    setSuccessfulRounds(0);
    setReactionTimes([]);
    setQuestionResults([]);
    setFinalMetrics(null);

    generateNewSequence(1, 1, mode);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      if (memorizeTimerRef.current) clearTimeout(memorizeTimerRef.current);
    };
  }, []);

  const finishGame = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsTimeUpBanner(true);

    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
    if (memorizeTimerRef.current) clearTimeout(memorizeTimerRef.current);

    const finalScore = scoreRef.current;
    const finalLevel = levelRef.current;
    const finalSuccessful = successfulRoundsRef.current;
    const finalReactionTimes = reactionTimesRef.current;

    const accuracy = finalSuccessful / TOTAL_QUESTIONS;
    const avgReaction =
      finalReactionTimes.length > 0
        ? Math.round(finalReactionTimes.reduce((a, b) => a + b, 0) / finalReactionTimes.length)
        : 650;

    let savedData: any = null;
    try {
      savedData = await gamesApi.saveSession({
        gameId: 'cup-stack',
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
  };

  // Handle click on a cup from the tray
  const handleCupClick = (cup: CupColor) => {
    if (phase !== 'STACKING' || isGameOverRef.current || isPausedRef.current) return;

    // Check if this cup is already in the user's stack
    if (userStack.some((c) => c.id === cup.id)) return;

    sounds.playClick();
    const newStack = [...userStack, cup];
    setUserStack(newStack);

    // If the tower is now complete (same height as target), evaluate it
    if (newStack.length === targetSequence.length) {
      if (roundTimerRef.current) clearInterval(roundTimerRef.current);
      evaluateAnswer(newStack);
    }
  };

  // Undo top cup
  const handleUndo = () => {
    if (phase !== 'STACKING' || userStack.length === 0 || isGameOverRef.current || isPausedRef.current) return;
    sounds.playClick();
    setUserStack((prev) => prev.slice(0, prev.length - 1));
  };

  // Reset entire stack
  const handleResetStack = () => {
    if (phase !== 'STACKING' || userStack.length === 0 || isGameOverRef.current || isPausedRef.current) return;
    sounds.playClick();
    setUserStack([]);
  };

  // Handle Timeout
  const handleRoundTimeout = () => {
    if (phase !== 'STACKING' || isGameOverRef.current) return;
    sounds.playWrong();
    setFeedback('TIMEOUT');
    setPhase('FEEDBACK');
    setQuestionResults((prev) => [...prev, 'WRONG']);

    comboRef.current = 0;
    setCombo(0);

    const nextQ = currentQuestion + 1;
    if (nextQ > TOTAL_QUESTIONS) {
      setTimeout(() => {
        finishGameRef.current();
      }, 1500);
    } else {
      setCurrentQuestion(nextQ);
      setTimeout(() => {
        if (!isGameOverRef.current) {
          generateNewSequence(nextQ, levelRef.current);
        }
      }, 1500);
    }
  };

  // Evaluate final answer against target sequence
  const evaluateAnswer = (completedStack: CupColor[]) => {
    const elapsedMs = Date.now() - roundStartTimeRef.current;
    reactionTimesRef.current.push(elapsedMs);
    setReactionTimes([...reactionTimesRef.current]);

    // Compare each position from bottom (0) to top
    const isCorrect = completedStack.every((cup, idx) => cup.id === targetSequence[idx]?.id);

    if (isCorrect) {
      sounds.playCorrect(comboRef.current);
      setFeedback('CORRECT');
      setPhase('FEEDBACK');
      setQuestionResults((prev) => [...prev, 'CORRECT']);

      successfulRoundsRef.current += 1;
      setSuccessfulRounds(successfulRoundsRef.current);

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      // Multiplier based on mode
      const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const maxTimeMs = getMaxPlacementTime(difficultyRef.current) * 1000;

      // Speed & Height Bonus scoring
      const timeBonus = Math.max(0, Math.floor((maxTimeMs - elapsedMs) / 25));
      const heightBonus = targetSequence.length * 60;
      const basePoints = 120 + newCombo * 30 + heightBonus + timeBonus;
      const points = Math.round(basePoints * multiplier);

      scoreRef.current += points;
      setScore(scoreRef.current);

      if (newCombo % 3 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }
    } else {
      sounds.playWrong();
      setFeedback('WRONG');
      setPhase('FEEDBACK');
      setQuestionResults((prev) => [...prev, 'WRONG']);

      comboRef.current = 0;
      setCombo(0);
    }

    const nextQ = currentQuestion + 1;
    if (nextQ > TOTAL_QUESTIONS) {
      setTimeout(() => {
        finishGameRef.current();
      }, 1400);
    } else {
      setCurrentQuestion(nextQ);

      setTimeout(() => {
        if (!isGameOverRef.current) {
          generateNewSequence(nextQ, levelRef.current);
        }
      }, 1400);
    }
  };

  // Helper to render a 3D trapezoid cup
  const renderCupGraphic = (cup: CupColor, isClickable: boolean = false, isUsed: boolean = false) => {
    return (
      <div
        className={`relative flex flex-col items-center justify-center transition-all ${
          isClickable && !isUsed
            ? 'cursor-pointer transform hover:-translate-y-1.5 active:scale-95'
            : isUsed
            ? 'opacity-30 cursor-not-allowed scale-90'
            : ''
        }`}
        style={{ width: '76px', height: '48px' }}
      >
        {/* Top Rim of Cup */}
        <div
          className="w-16 h-3.5 rounded-[50%] border shadow-inner z-10"
          style={{
            backgroundColor: cup.hex,
            borderColor: cup.borderHex,
          }}
        />

        {/* Cup Body (Trapezoid) */}
        <div
          className={`-mt-1.5 w-14 h-9 rounded-b-xl border-x border-b shadow-lg flex items-center justify-center text-white font-bold text-[11px] bg-gradient-to-b ${cup.gradient}`}
          style={{
            borderColor: cup.borderHex,
            boxShadow: `0 4px 15px ${cup.shadow}`,
          }}
        >
          <span className="drop-shadow">{cup.name}</span>
        </div>
      </div>
    );
  };

  const activePalette = getActivePalette(difficultyRef.current);

  // 1. Difficulty Mode Selection Screen (Before game starts)
  if (!hasStarted) {
    return (
      <DifficultySelectionScreen
        gameTitle="Cup Stack"
        category="Sıralı Hafıza & Planlama"
        description="Bardak kulesinin renk sıralamasını aklınızda tutun ve aşağıdan yukarıya doğru yeniden inşa edin."
        onSelectDifficulty={handleSelectDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Isınma ve rahat bir sıralı hafıza egzersizi için idealdir.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: '3 Temel Renk', text: '(Kırmızı, Mavi, Yeşil)' },
              { strong: '2 veya 3 Katlı', text: 'kolay kuleler' },
              { strong: '14 Saniye', text: 'geniş dizme süresi' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik Lumosity tarzı dengeli sıralı hafıza testi.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: '5 Renk Paleti', text: '' },
              { strong: '3 veya 4 Katlı', text: 'orta kuleler (nadiren 5)' },
              { strong: '10 Saniye', text: 'standart dizme süresi' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod (Hızlı Kule)',
            description: 'Yüksek odaklanma gerektiren 4-5 katlı dev kuleler!',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: '5 Renk Paleti', text: '' },
              { strong: '4 veya 5 Katlı', text: 'zorlu kuleler' },
              { strong: '8 Saniye', text: 'seri dizme süresi', highlight: true },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <>
            <strong className="text-white block mb-1">Cup Stack İpuçları:</strong>
            Bardak kulesi aşağıdan yukarıya doğru inşa edilir (1. bardak en altta yer alır). Kule yukarı doğru kaybolmadan önce renk sırasını zihninizde bir hikaye veya ritim oluşturarak kodlayın.
          </>
        }
      />
    );
  }

  // 2. Active Game Surface
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none animate-fade-in">
      
      {/* Standard Unified Game Header with Question Dot Progress */}
      <GameHeader
        title="Cup Stack"
        category="Sıralı Hafıza"
        score={score}
        combo={combo}
        level={level}
        onExit={onExit}
        onPauseToggle={handlePauseToggle}
        centerContent={
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5">
            {Array.from({ length: TOTAL_QUESTIONS }).map((_, idx) => {
              const result = questionResults[idx];
              const isCurrent = currentQuestion === idx + 1;
              return (
                <span
                  key={idx}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    result === 'CORRECT'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : result === 'WRONG'
                      ? 'bg-red-500'
                      : isCurrent
                      ? 'bg-pink-400 animate-ping'
                      : 'bg-slate-700'
                  }`}
                  title={`Soru ${idx + 1}`}
                />
              );
            })}
          </div>
        }
      />

      {/* Main Game Stage */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border-[2.5px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col items-center min-h-[500px] justify-between relative overflow-hidden text-black">
        
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

        {/* Header Status & Round Timer */}
        <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#fffdf5] border-2 border-black text-xs font-mono shadow-[2px_2px_0px_0px_#000]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-black stroke-[2.5]" />
            <span className="text-black font-black">
              {phase === 'MEMORIZE' && `SORU ${currentQuestion}/${TOTAL_QUESTIONS}: KARTTAKİ SIRALAMAYI AKLINDA TUT!`}
              {phase === 'SLIDING_OUT' && 'HAZIRLAN...'}
              {phase === 'STACKING' && 'BARDAKLARI AŞAĞIDAN YUKARIYA DİZİN:'}
              {phase === 'FEEDBACK' && (
                feedback === 'CORRECT'
                  ? '✓ MÜKEMMEL DİZİLİM!'
                  : feedback === 'TIMEOUT'
                  ? '⏱ SÜRE DOLDU!'
                  : '✗ SIRALAMA YANLIŞTI!'
              )}
            </span>
          </div>

          {/* Round Placement Timer */}
          {phase === 'STACKING' && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
              roundTimeLeft <= 3 ? 'bg-[#ff6b6b] text-black animate-pulse' : 'bg-[#fde047] text-black'
            }`}>
              <Timer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{roundTimeLeft}s</span>
            </div>
          )}
        </div>

        {/* Center Stage: Target Card (Memorize) OR Interactive Tower (Stacking) */}
        <div className="relative w-full flex-1 flex flex-col items-center justify-center my-4">
          
          {/* Phase 1: Memorization Target Card with Slide-Up Animation */}
          {(phase === 'MEMORIZE' || phase === 'SLIDING_OUT') && (
            <div
              className={`w-72 sm:w-80 rounded-3xl bg-[#fffdf5] border-2 border-black p-6 shadow-[5px_5px_0px_0px_#000] flex flex-col items-center justify-center transition-all duration-500 ${
                phase === 'SLIDING_OUT'
                  ? 'transform -translate-y-96 opacity-0 scale-75'
                  : 'transform translate-y-0 opacity-100 scale-100'
              }`}
            >
              <div className="flex items-center justify-between w-full text-black text-xs font-mono font-black mb-4 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <ArrowUp className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>Aşağıdan Yukarıya</span>
                </div>
                <span className="neo-badge bg-[#fde047] text-black text-[10px]">
                  {targetSequence.length}'Lİ KULE
                </span>
              </div>

              {/* Target Cups Stacked (rendered bottom-to-top via column-reverse) */}
              <div className="flex flex-col-reverse items-center gap-1 my-2">
                {targetSequence.map((cup, idx) => (
                  <div key={cup.id} className="relative flex items-center">
                    <span className="absolute -left-7 text-[10px] text-neutral-600 font-mono font-bold">
                      {idx + 1}.
                    </span>
                    {renderCupGraphic(cup)}
                  </div>
                ))}
              </div>

              {/* Pedestal Platform */}
              <div className="w-36 h-3 rounded-full bg-white border-2 border-black mt-1 shadow-[2px_2px_0px_0px_#000]" />
              
              <div className="text-[11px] text-neutral-600 font-bold font-mono mt-3 animate-pulse">
                Kart 2-3 saniye sonra yukarı kaybolacak...
              </div>
            </div>
          )}

          {/* Phase 2: Active Stacking Tower */}
          {(phase === 'STACKING' || phase === 'FEEDBACK') && (
            <div className="flex flex-col items-center justify-end min-h-[220px]">
              
              {/* Stack of cups (Bottom to Top displayed in column-reverse) */}
              <div className={`flex flex-col-reverse items-center gap-0.5 transition-all ${
                feedback === 'WRONG' || feedback === 'TIMEOUT' ? 'animate-shake' : ''
              }`}>
                {userStack.map((cup, idx) => (
                  <div
                    key={cup.id + idx}
                    className="relative flex items-center animate-scale-in"
                  >
                    <span className="absolute -left-6 text-[10px] text-black font-mono font-black">
                      {idx + 1}
                    </span>
                    {renderCupGraphic(cup)}
                  </div>
                ))}

                {/* Empty placeholders for unstacked cups */}
                {Array.from({ length: targetSequence.length - userStack.length }).map((_, i) => (
                  <div
                    key={'empty_' + i}
                    className="w-16 h-8 rounded-xl border-2 border-dashed border-black/40 flex items-center justify-center text-neutral-500 text-[10px] font-mono font-bold my-0.5"
                  >
                    {userStack.length + i + 1}. Kat
                  </div>
                ))}
              </div>

              {/* Pedestal Base */}
              <div className="w-48 h-4 rounded-xl bg-white border-2 border-black mt-1 shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
                <span className="text-[9px] text-neutral-600 font-bold font-mono">KULE TABANI</span>
              </div>

              {/* Correct Answer Reveal on Wrong */}
              {phase === 'FEEDBACK' && feedback !== 'CORRECT' && (
                <div className="mt-4 p-3 rounded-xl bg-[#fffdf5] border-2 border-black text-xs text-black text-center shadow-[3px_3px_0px_0px_#000] animate-fade-in">
                  <div className="text-black font-black mb-1">Doğru Sıralama (Aşağıdan Yukarıya):</div>
                  <div className="flex items-center justify-center gap-1 font-mono">
                    {targetSequence.map((c, i) => (
                      <span key={c.id} style={{ color: c.hex }} className="font-bold">
                        {i + 1}.{c.name} {i < targetSequence.length - 1 ? '→' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Phase 2: Clickable Cup Tray & Controls */}
        <div className="w-full flex flex-col items-center gap-4 mt-2">
          
          {/* Action Tools (Undo & Reset) */}
          {phase === 'STACKING' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={userStack.length === 0 || isPaused}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Geri Al</span>
              </button>

              <button
                onClick={handleResetStack}
                disabled={userStack.length === 0 || isPaused}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-black border-2 border-black text-xs font-black flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-40 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sıfırla</span>
              </button>
            </div>
          )}

          {/* Cup Selection Tray (renders active palette for current mode) */}
          <div className="p-4 rounded-2xl bg-[#fffdf5] border-2 border-black w-full flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto shadow-[3px_3px_0px_0px_#000]">
            {activePalette.map((cup) => {
              const isUsed = userStack.some((c) => c.id === cup.id);
              return (
                <button
                  key={cup.id}
                  onClick={() => handleCupClick(cup)}
                  disabled={phase !== 'STACKING' || isUsed || isPaused}
                  className="focus:outline-none"
                >
                  {renderCupGraphic(cup, true, isUsed)}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-neutral-600 font-bold font-mono text-center">
            {phase === 'STACKING'
              ? 'Bardaklara tıklayarak en alttan başlayarak kuleye yerleştirin.'
              : 'Karttaki renk dizilimini aklınızda tutun.'}
          </p>
        </div>

      </div>

      {/* Game Over Modal upon completing all questions */}
      {isGameOver && finalMetrics && (
        <GameOverModal
          score={finalMetrics.score}
          accuracy={finalMetrics.accuracy}
          avgReactionMs={finalMetrics.avgReactionMs}
          maxLevel={finalMetrics.maxLevel}
          bpiEarned={finalMetrics.bpiEarned}
          bpiDelta={finalMetrics.bpiDelta}
          category={`Sıralı Hafıza (${difficulty === 'EASY' ? 'Kolay' : difficulty === 'HARD' ? 'Zor' : 'Orta'})`}
          onPlayAgain={() => {
            isGameOverRef.current = false;
            scoreRef.current = 0;
            levelRef.current = 1;
            comboRef.current = 0;
            successfulRoundsRef.current = 0;
            reactionTimesRef.current = [];
            setFinalMetrics(null);
            setIsGameOver(false);
            setIsPaused(false);
            isPausedRef.current = false;
            setCurrentQuestion(1);
            setLevel(1);
            setScore(0);
            setCombo(0);
            setSuccessfulRounds(0);
            setReactionTimes([]);
            setQuestionResults([]);
            generateNewSequence(1, 1, difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
