import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scale, TrendingUp, TrendingDown, ShieldCheck, Zap, Flame, Sparkles, ArrowLeft, ArrowRight, HelpCircle, Clock } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type TargetRule = 'LARGER' | 'SMALLER';

interface CompareCard {
  expression: string;
  value: number;
}

interface Question {
  left: CompareCard;
  right: CompareCard;
  targetRule: TargetRule; // 'LARGER' or 'SMALLER'
  correctChoice: 'LEFT' | 'RIGHT';
}

interface NumberCompareGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const NumberCompareGame: React.FC<NumberCompareGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
}) => {
  const { user, updateUserBpi } = useAuthStore();

  // Mode & Setup state
  const [mode, setMode] = useState<DifficultyMode | null>(null);

  // Game Engine State
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isTimeUpBanner, setIsTimeUpBanner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Question & Feedback State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedSide, setSelectedSide] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Metrics tracking with Refs for stale closure safety
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

  const questionStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  // Helper to generate a single expression based on difficulty mode
  const generateExpression = (selectedMode: DifficultyMode, currentLevel: number): CompareCard => {
    if (selectedMode === 'EASY') {
      // EASY: Plain 1 or 2 digit numbers (no math operations)
      const num = Math.floor(1 + Math.random() * 98); // 1..98
      return { expression: `${num}`, value: num };
    }

    if (selectedMode === 'MEDIUM') {
      // MEDIUM: Math operations (+) and (-), or 2-digit numbers
      const type = Math.random();
      if (type < 0.35) {
        // Addition: 12 + 15..55
        const a = Math.floor(10 + Math.random() * 45);
        const b = Math.floor(8 + Math.random() * 35);
        return { expression: `${a} + ${b}`, value: a + b };
      } else if (type < 0.70) {
        // Subtraction: 25 - 10..60
        const a = Math.floor(25 + Math.random() * 55);
        const b = Math.floor(5 + Math.random() * (a - 5));
        return { expression: `${a} - ${b}`, value: a - b };
      } else {
        // Plain 2-digit number comparison
        const num = Math.floor(15 + Math.random() * 80);
        return { expression: `${num}`, value: num };
      }
    }

    // HARD MODE: Multiplication (*), Division (/), Addition (+), Subtraction (-)
    const opRand = Math.random();
    if (opRand < 0.30) {
      // Multiplication: 3..12 * 3..12
      const a = Math.floor(3 + Math.random() * 10);
      const b = Math.floor(3 + Math.random() * 9);
      return { expression: `${a} × ${b}`, value: a * b };
    } else if (opRand < 0.60) {
      // Division: Clean integer division (e.g. 72 / 8 = 9, 100 / 2 = 50)
      const b = Math.floor(2 + Math.random() * 8); // divisor 2..9
      const result = Math.floor(4 + Math.random() * 15); // result 4..18
      const a = b * result;
      return { expression: `${a} ÷ ${b}`, value: result };
    } else if (opRand < 0.80) {
      // Mixed Addition
      const a = Math.floor(25 + Math.random() * 65);
      const b = Math.floor(15 + Math.random() * 45);
      return { expression: `${a} + ${b}`, value: a + b };
    } else {
      // Subtraction
      const a = Math.floor(45 + Math.random() * 55);
      const b = Math.floor(10 + Math.random() * (a - 10));
      return { expression: `${a} - ${b}`, value: a - b };
    }
  };

  // Generate full question ensuring left.value !== right.value
  const createQuestion = useCallback((selectedMode: DifficultyMode, currentLevel: number): Question => {
    let left = generateExpression(selectedMode, currentLevel);
    let right = generateExpression(selectedMode, currentLevel);

    // Ensure values are not equal
    let safetyCounter = 0;
    while (left.value === right.value && safetyCounter < 20) {
      right = generateExpression(selectedMode, currentLevel);
      safetyCounter++;
    }

    // If still equal by rare chance, add 1 to right
    if (left.value === right.value) {
      right = { expression: `${right.value + 1}`, value: right.value + 1 };
    }

    // Determine target rule
    let rule: TargetRule = 'LARGER';
    if (selectedMode === 'HARD') {
      // Hard mode randomly asks for SMALLER (~45% of the time)
      rule = Math.random() < 0.45 ? 'SMALLER' : 'LARGER';
    }

    // Correct side calculation
    let correctChoice: 'LEFT' | 'RIGHT' = 'LEFT';
    if (rule === 'LARGER') {
      correctChoice = left.value > right.value ? 'LEFT' : 'RIGHT';
    } else {
      correctChoice = left.value < right.value ? 'LEFT' : 'RIGHT';
    }

    return {
      left,
      right,
      targetRule: rule,
      correctChoice,
    };
  }, []);

  // Finish Game Handler
  const finishGame = useCallback(async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsTimeUpBanner(true);

    const attempts = totalAttemptsRef.current;
    const correct = correctAttemptsRef.current;
    const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;
    const rTimes = reactionTimesRef.current;
    const avgReaction = rTimes.length > 0
      ? Math.round(rTimes.reduce((a, b) => a + b, 0) / rTimes.length)
      : 0;

    const metrics = {
      score: scoreRef.current,
      accuracy: accuracy / 100,
      correctCount: correct,
      totalCount: attempts,
      avgReactionMs: avgReaction,
      maxLevel: levelRef.current,
      difficultyMode: modeRef.current,
    };

    try {
      const res = await gamesApi.saveSession({
        gameId: 'number-compare',
        score: scoreRef.current,
        rawAccuracy: accuracy / 100,
        avgReactionMs: avgReaction,
        maxLevel: levelRef.current,
      });
      if (res && res.newOverallBpi) {
        updateUserBpi(res.newOverallBpi);
      }
    } catch (err) {
      console.error('Failed to save Number Compare game session:', err);
    }

    setTimeout(() => {
      setIsTimeUpBanner(false);
      setIsGameOver(true);
      setFinalMetrics(metrics);
    }, 2200);
  }, [updateUserBpi]);

  finishGameRef.current = finishGame;

  // Global Countdown Timer
  useEffect(() => {
    if (!mode || isGameOver || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishGameRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, isGameOver, isPaused]);

  // Start game with selected difficulty
  const handleSelectDifficulty = (selectedMode: DifficultyMode) => {
    setMode(selectedMode);
    modeRef.current = selectedMode;

    // Reset scores & metrics
    setLevel(1);
    setScore(0);
    setCombo(0);
    setTimeLeft(45);
    setIsGameOver(false);
    setIsPaused(false);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setReactionTimes([]);
    setSelectedSide(null);
    setFeedback(null);

    scoreRef.current = 0;
    levelRef.current = 1;
    comboRef.current = 0;
    totalAttemptsRef.current = 0;
    correctAttemptsRef.current = 0;
    reactionTimesRef.current = [];
    isGameOverRef.current = false;
    isPausedRef.current = false;

    // Spawn first question
    const q = createQuestion(selectedMode, 1);
    setCurrentQuestion(q);
    questionStartTimeRef.current = Date.now();
  };

  // Handle player choice (LEFT or RIGHT)
  const handleChoice = useCallback((side: 'LEFT' | 'RIGHT') => {
    if (!currentQuestion || isGameOverRef.current || isPausedRef.current || selectedSide !== null) return;

    const reactionTime = Date.now() - questionStartTimeRef.current;
    reactionTimesRef.current.push(reactionTime);
    setReactionTimes([...reactionTimesRef.current]);

    setSelectedSide(side);
    totalAttemptsRef.current += 1;
    setTotalAttempts(totalAttemptsRef.current);

    const isCorrect = side === currentQuestion.correctChoice;

    if (isCorrect) {
      sounds.playCorrect();
      setFeedback('CORRECT');
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);

      comboRef.current += 1;
      setCombo(comboRef.current);

      // Score Multiplier based on mode
      const mult = modeRef.current === 'HARD' ? 1.6 : modeRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const speedBonus = Math.max(0, Math.round((2000 - reactionTime) / 10));
      const comboBonus = comboRef.current * 15;
      const earnedScore = Math.round((100 + speedBonus + comboBonus) * mult);

      scoreRef.current += earnedScore;
      setScore(scoreRef.current);

      // Level progression every 5 correct answers
      if (correctAttemptsRef.current % 5 === 0) {
        levelRef.current += 1;
        setLevel(levelRef.current);
      }
    } else {
      sounds.playWrong();
      setFeedback('WRONG');
      comboRef.current = 0;
      setCombo(0);
    }

    // Load next question after short visual pulse
    setTimeout(() => {
      setSelectedSide(null);
      setFeedback(null);
      if (!isGameOverRef.current) {
        const nextQ = createQuestion(modeRef.current, levelRef.current);
        setCurrentQuestion(nextQ);
        questionStartTimeRef.current = Date.now();
      }
    }, 280);
  }, [currentQuestion, createQuestion, selectedSide]);

  // Keyboard navigation (Left/Right Arrows, A/D keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!mode || isGameOver || isPaused || selectedSide !== null) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleChoice('LEFT');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleChoice('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isGameOver, isPaused, selectedSide, handleChoice]);

  // Difficulty selection options definition
  const difficultyOptions = {
    EASY: {
      title: 'Kolay Mod',
      description: 'İşlemsiz 1 veya 2 basamaklı sayılardan oluşan hızlı karşılaştırma.',
      multiplierBadge: '1.0x Puan',
      icon: ShieldCheck,
      features: [
        { strong: 'Yalın Sayılar:', text: 'İşlemsiz 1 veya 2 basamaklı sayılar' },
        { strong: 'Hedef:', text: 'Her zaman DAHA BÜYÜK olanı seç' },
        { strong: 'Tempo:', text: 'Rahat ve öğrenmeye uygun süre' },
      ],
      buttonText: 'Kolay Modda Başla',
    },
    MEDIUM: {
      title: 'Orta Mod (Klasik)',
      description: 'İşlemli (+ ve -) ile 2 basamaklı sayı karşılaştırmaları.',
      multiplierBadge: '1.25x Puan',
      badgeExtra: 'ÖNERİLEN',
      icon: Zap,
      features: [
        { strong: 'Aritmetik:', text: 'Toplama (+), Çıkarma (-) ve 2 basamaklı sayılar', highlight: true },
        { strong: 'Örnekler:', text: '23 vs 44, 16-2 vs 9+7' },
        { strong: 'Hedef:', text: 'Her zaman DAHA BÜYÜK olanı seç' },
      ],
      buttonText: 'Orta Modda Başla',
    },
    HARD: {
      title: 'Zor Mod (Dinamik Hedef)',
      description: 'Çarpma (×), Bölme (÷) ve anlık değişen Küçük/Büyük seçimi!',
      multiplierBadge: '1.6x Puan',
      icon: Flame,
      features: [
        { strong: 'Zorlu İşlemler:', text: 'Çarpma (×) ve Bölme (÷) dahil işlemler', highlight: true },
        { strong: 'Dinamik Kural:', text: 'Bazen DAHA KÜÇÜK olanı seçme uyarısı!', highlight: true },
        { strong: 'Örnekler:', text: '4×12 vs 100÷2 (Küçük/Büyük uyarısına dikkat)' },
      ],
      buttonText: 'Zor Modda Başla',
    },
  };

  // Render Difficulty Selection Screen if mode not chosen yet
  if (!mode) {
    return (
      <DifficultySelectionScreen
        gameTitle="Number Compare"
        category="LOGIC & SPEED"
        description="İki taraftaki ifadeyi kıyasla; hedef kurala göre daha büyük veya daha küçük olanı şimşek hızında seç!"
        onSelectDifficulty={handleSelectDifficulty}
        onExit={onExit}
        options={difficultyOptions}
        infoNote={
          <div className="flex items-center gap-3 text-slate-300 text-xs">
            <HelpCircle className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>
              Klavyenizdeki <strong>Sol Ok (←)</strong> veya <strong>A</strong> tuşu ile Sol Kartı, <strong>Sağ Ok (→)</strong> veya <strong>D</strong> tuşu ile Sağ Kartı hızlıca seçebilirsiniz.
            </span>
          </div>
        }
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 select-none animate-fade-in">
      
      {/* Standardized Header with Pause Modal */}
      <GameHeader
        title="Number Compare"
        category="LOGIC & SPEED"
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        level={level}
        onExit={onExit}
        onPauseToggle={setIsPaused}
      />

      {/* Main Game Playing Area */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-[2.5px] border-black relative overflow-hidden flex flex-col items-center justify-between min-h-[440px] shadow-[6px_6px_0px_0px_#000] text-black">
        
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

        {/* Combo & Score Multiplier Pill */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="neo-badge bg-[#fde047] text-black">
              MOD: {mode} ({mode === 'HARD' ? '1.6x' : mode === 'MEDIUM' ? '1.25x' : '1.0x'})
            </span>
          </div>

          {combo > 1 && (
            <div className="neo-badge bg-[#ffd43b] text-black animate-bounce">
              <Zap className="w-4 h-4 stroke-[2.5]" />
              <span>{combo} SERİ KOMBO!</span>
            </div>
          )}
        </div>

        {/* Dynamic Target Goal Banner */}
        {currentQuestion && (
          <div className="w-full max-w-xl mx-auto mb-6">
            {currentQuestion.targetRule === 'LARGER' ? (
              <div className="py-3.5 px-6 rounded-2xl bg-[#fde047] border-2 border-black text-black flex items-center justify-center gap-3 shadow-[3px_3px_0px_0px_#000] animate-fade-in">
                <TrendingUp className="w-6 h-6 text-black stroke-[3] shrink-0" />
                <span className="font-black tracking-wider text-base sm:text-lg text-black">
                  DAHA BÜYÜK OLANI SEÇ
                </span>
              </div>
            ) : (
              <div className="py-3.5 px-6 rounded-2xl bg-[#ff6b6b] border-2 border-black text-black flex items-center justify-center gap-3 shadow-[3px_3px_0px_0px_#000] animate-pulse">
                <TrendingDown className="w-6 h-6 text-black stroke-[3] shrink-0" />
                <div className="flex flex-col items-center">
                  <span className="font-black tracking-wider text-base sm:text-lg text-black uppercase">
                    ⚠️ DAHA KÜÇÜK OLANI SEÇ!
                  </span>
                  <span className="text-[11px] text-black font-bold">
                    (Dikkat: En küçük değerli kartı seçmelisin)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compare Cards Container (LEFT vs RIGHT) */}
        {currentQuestion && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 my-auto max-w-2xl">
            
            {/* LEFT CARD */}
            <button
              onClick={() => handleChoice('LEFT')}
              disabled={selectedSide !== null || isPaused}
              className={`group relative p-8 sm:p-10 rounded-3xl border-2 border-black text-center transition-all duration-150 transform cursor-pointer flex flex-col items-center justify-center min-h-[160px] sm:min-h-[190px] shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                selectedSide === 'LEFT'
                  ? feedback === 'CORRECT'
                    ? 'bg-[#4ecdc4] text-black'
                    : 'bg-[#ff6b6b] text-black'
                  : 'bg-[#fffdf5] hover:bg-amber-50 text-black'
              }`}
            >
              <span className="absolute top-3 left-4 text-[10px] font-mono font-black text-black bg-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                SOL [ ← / A ]
              </span>

              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight">
                {currentQuestion.left.expression}
              </div>
            </button>

            {/* RIGHT CARD */}
            <button
              onClick={() => handleChoice('RIGHT')}
              disabled={selectedSide !== null || isPaused}
              className={`group relative p-8 sm:p-10 rounded-3xl border-2 border-black text-center transition-all duration-150 transform cursor-pointer flex flex-col items-center justify-center min-h-[160px] sm:min-h-[190px] shadow-[4px_4px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
                selectedSide === 'RIGHT'
                  ? feedback === 'CORRECT'
                    ? 'bg-[#4ecdc4] text-black'
                    : 'bg-[#ff6b6b] text-black'
                  : 'bg-[#fffdf5] hover:bg-amber-50 text-black'
              }`}
            >
              <span className="absolute top-3 right-4 text-[10px] font-mono font-black text-black bg-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                SAĞ [ → / D ]
              </span>

              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight">
                {currentQuestion.right.expression}
              </div>
            </button>

          </div>
        )}

        {/* Footer controls & key guidance */}
        <div className="w-full flex items-center justify-between text-xs text-neutral-600 font-bold font-mono mt-6 pt-4 border-t-2 border-black">
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Sol Kart</span>
          </div>
          <div className="text-neutral-500 font-medium">Klavyenizdeki Yön Tuşları veya A / D Tuşları</div>
          <div className="flex items-center gap-2">
            <span>Sağ Kart</span>
            <ArrowRight className="w-4 h-4 text-black stroke-[2.5]" />
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
          bpiEarned={finalMetrics.score}
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

export default NumberCompareGame;
