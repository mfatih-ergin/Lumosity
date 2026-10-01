import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Wind, Clock } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface LostInFlightGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
  // Duel synchronization props
  duelSeed?: string;
  onDuelScoreUpdate?: (score: number, combo: number, round: number) => void;
}

export const LostInFlightGame: React.FC<LostInFlightGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
  duelSeed,
  onDuelScoreUpdate,
}) => {
  const { user, updateUserBpi } = useAuthStore();

  // Difficulty selection mode
  const [difficulty, setDifficulty] = useState<DifficultyMode | null>(duelSeed ? 'MEDIUM' : null);
  const difficultyRef = useRef<DifficultyMode>(duelSeed ? 'MEDIUM' : 'MEDIUM');

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Flock state
  const [centerDirection, setCenterDirection] = useState<Direction>('UP');
  const [flankDirections, setFlankDirections] = useState<Direction[]>(['UP', 'UP', 'UP', 'UP']);
  const [isReverseWind, setIsReverseWind] = useState(false);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Performance metrics tracking with synchronous Refs to prevent stale closure bugs
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

  const roundStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});
  const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  const generateNewFlock = useCallback((currentLevel: number, forcedDiff?: DifficultyMode) => {
    const activeDiff = forcedDiff || difficultyRef.current || 'MEDIUM';
    const mainDir = directions[Math.floor(Math.random() * directions.length)];
    
    // Incongruent flankers become more frequent based on difficulty & level
    let flankerConflictChance = 0.5;
    if (activeDiff === 'EASY') {
      flankerConflictChance = Math.min(0.35, 0.15 + currentLevel * 0.04);
    } else if (activeDiff === 'HARD') {
      flankerConflictChance = Math.min(0.95, 0.70 + currentLevel * 0.05);
    } else {
      flankerConflictChance = Math.min(0.80, 0.35 + currentLevel * 0.08);
    }

    const flankers = Array.from({ length: 4 }).map(() => {
      if (Math.random() < flankerConflictChance) {
        const otherDirs = directions.filter((d) => d !== mainDir);
        return otherDirs[Math.floor(Math.random() * otherDirs.length)];
      }
      return mainDir;
    });

    // Reverse wind logic: Easy has NO reverse wind; Hard can have it from level 1; Medium from level 3
    let isReverse = false;
    if (activeDiff === 'EASY') {
      isReverse = false;
    } else if (activeDiff === 'HARD') {
      isReverse = Math.random() < 0.50;
    } else {
      isReverse = currentLevel >= 3 ? Math.random() < 0.35 : false;
    }

    setCenterDirection(mainDir);
    setFlankDirections(flankers);
    setIsReverseWind(isReverse);
    setFeedback(null);
    roundStartTimeRef.current = Date.now();
  }, []);

  // Initial flock
  useEffect(() => {
    if (difficulty) {
      generateNewFlock(1, difficulty);
    }
  }, [difficulty, generateNewFlock]);

  const finishGame = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

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
        : 550;

    setIsGameOver(true);
    setFinalMetrics({
      score: finalScore,
      accuracy,
      avgReactionMs: avgReaction,
      maxLevel: finalLevel,
      bpiEarned: 650,
      bpiDelta: 0,
    });

    try {
      const savedData = await gamesApi.saveSession({
        gameId: 'lost-in-flight',
        score: finalScore,
        rawAccuracy: accuracy,
        avgReactionMs: avgReaction,
        maxLevel: finalLevel,
      });

      if (savedData && savedData.newOverallBpi && user) {
        updateUserBpi(savedData.newOverallBpi, savedData.user?.streakDays);
      }
      if (savedData?.session) {
        setFinalMetrics((prev: any) => ({
          ...prev,
          bpiEarned: savedData.session?.bpiEarned || 650,
          bpiDelta: savedData.bpiDelta || 0,
        }));
      }
    } catch (err) {
      console.error('Save session error:', err);
    }
  };

  finishGameRef.current = finishGame;

  const handlePauseToggle = (paused: boolean) => {
    setIsPaused(paused);
    isPausedRef.current = paused;
    if (paused) {
      pauseStartTimeRef.current = Date.now();
    } else if (pauseStartTimeRef.current > 0) {
      const pausedDuration = Date.now() - pauseStartTimeRef.current;
      roundStartTimeRef.current += pausedDuration;
      pauseStartTimeRef.current = 0;
    }
  };

  // Main Timer (pauses when modal active)
  useEffect(() => {
    if (isGameOver || isPaused) return;
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
  }, [isGameOver, isPaused]);

  const getOppositeDirection = (dir: Direction): Direction => {
    switch (dir) {
      case 'UP': return 'DOWN';
      case 'DOWN': return 'UP';
      case 'LEFT': return 'RIGHT';
      case 'RIGHT': return 'LEFT';
    }
  };

  const handleInput = useCallback((inputDir: Direction) => {
    if (isGameOverRef.current || isPausedRef.current) return;

    const reaction = Date.now() - roundStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setReactionTimes([...reactionTimesRef.current]);
    setTotalAttempts(totalAttemptsRef.current);

    const expectedDir = isReverseWind ? getOppositeDirection(centerDirection) : centerDirection;
    const isCorrect = inputDir === expectedDir;

    if (isCorrect) {
      sounds.playCorrect(comboRef.current);
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);
      setFeedback('CORRECT');

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      // Speed bonus: faster responses earn more points, scaled by difficulty
      const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const speedBonus = Math.max(0, Math.floor((1000 - reaction) / 10));
      const points = Math.round((100 + newCombo * 20 + speedBonus) * multiplier);
      scoreRef.current += points;
      const newScore = scoreRef.current;
      setScore(newScore);

      if (onDuelScoreUpdate) {
        onDuelScoreUpdate(newScore, newCombo, totalAttemptsRef.current);
      }

      // Level up threshold
      if (newCombo % 6 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }

      generateNewFlock(levelRef.current);
    } else {
      sounds.playWrong();
      setFeedback('WRONG');
      comboRef.current = 0;
      setCombo(0);
      generateNewFlock(levelRef.current);
    }
  }, [centerDirection, isReverseWind, onDuelScoreUpdate, generateNewFlock]);

  const renderBirdIcon = (dir: Direction, isCenter: boolean = false) => {
    const rotationClass =
      dir === 'UP' ? 'rotate-0' : dir === 'RIGHT' ? 'rotate-90' : dir === 'DOWN' ? 'rotate-180' : '-rotate-90';

    return (
      <div
        className={`transition-all transform duration-150 flex items-center justify-center ${rotationClass} ${
          isCenter
            ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#fde047] border-[2.5px] border-black shadow-[4px_4px_0px_0px_#000] scale-110 text-black'
            : 'w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-white border-2 border-black text-black shadow-[2px_2px_0px_0px_#000] opacity-80'
        }`}
      >
        <ArrowUp className={`${isCenter ? 'w-8 h-8 sm:w-10 sm:h-10 text-black stroke-[3]' : 'w-5 h-5 sm:w-6 sm:h-6 text-black stroke-[2.5]'}`} />
      </div>
    );
  };

  // Keyboard navigation
  useEffect(() => {
    if (isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        handleInput('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        handleInput('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        handleInput('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        handleInput('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, isPaused]);

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle="Lost in Flight"
        category="Dikkat & Odak"
        description="Sürünün tam merkezindeki lider kuşa odaklanın. Çevreleyen yanıltıcı kuşlara ve ters esen rüzgara aldırmadan yönünü anında belirleyin."
        onSelectDifficulty={(mode) => {
          setDifficulty(mode);
          difficultyRef.current = mode;
          const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
          setTimeLeft(initialTime);
          generateNewFlock(1, mode);
        }}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Daha sakin bir sürü ve net yönlendirmeler ile temel dikkat odaklanması.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Geniş tepki süresi)' },
              { strong: 'Sürü Çatışması:', text: 'Düşük (%20 - Kuşların çoğu aynı yönde uçar)' },
              { strong: 'Ters Rüzgar:', text: 'Kapalı (Ters yön kuralı uygulanmaz)' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik Lumosity Lost in Migration deneyimi ve seviyeli ters rüzgar fırtınası.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart odak temposu)' },
              { strong: 'Sürü Çatışması:', text: 'Dengeli (%40-70 - Yanıltıcı çevre kuşları)' },
              { strong: 'Ters Rüzgar:', text: 'Seviye 3+ devreye girer (Zıt yön kuralı)' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: 'Maksimum yanıltıcı sürü, sürekli fırtına ve şimşek hızında refleks gereksinimi.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Yüksek tempolu refleks)' },
              { strong: 'Sürü Çatışması:', text: 'Aşırı Yüksek (%85+ - Hemen hemen tüm sürü ters yönde)' },
              { strong: 'Ters Rüzgar:', text: '1. Seviyeden İtibaren Aktif (%50 fırtına olasılığı)' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Odak noktanızı sadece merkezdeki sarı renkli büyük kuşa sabitleyin. Çevredeki beyaz kuşların yönünü göz ucuyla bile takip etmemeye çalışın!
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none animate-fade-in text-black">
      <GameHeader
        title="Lost in Flight"
        category="Dikkat & Odak"
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        level={level}
        onExit={onExit}
        onPauseToggle={handlePauseToggle}
      />

      <div className={`w-full bg-white rounded-3xl p-6 sm:p-10 border-[2.5px] border-black transition-all duration-300 shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden ${
        feedback === 'CORRECT' ? 'ring-4 ring-[#4ecdc4]' : feedback === 'WRONG' ? 'ring-4 ring-[#ff6b6b]' : ''
      }`}>
        
        {/* Modifier Banner (Normal vs Reverse Wind) */}
        <div className={`mb-6 flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black text-xs font-black font-mono transition-all shadow-[2px_2px_0px_0px_#000] ${
          isReverseWind
            ? 'bg-[#ffbe76] text-black animate-pulse'
            : 'bg-[#fffdf5] text-black'
        }`}>
          {isReverseWind ? (
            <>
              <Wind className="w-4 h-4 text-black stroke-[2.5]" />
              <span>TERS RÜZGAR AKTİF: ZIT YÖNÜ SEÇİN!</span>
            </>
          ) : (
            <span>MERKEZDEKİ KUŞUN YÖNÜNE ODAKLAN</span>
          )}
        </div>

        {/* Flanker Display Layout (Cross Pattern) */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-4">
          
          {/* Top Flanker */}
          <div className="absolute top-2">
            {renderBirdIcon(flankDirections[0])}
          </div>

          {/* Left Flanker */}
          <div className="absolute left-2">
            {renderBirdIcon(flankDirections[1])}
          </div>

          {/* Target Center Bird */}
          <div className="z-10">
            {renderBirdIcon(centerDirection, true)}
          </div>

          {/* Right Flanker */}
          <div className="absolute right-2">
            {renderBirdIcon(flankDirections[2])}
          </div>

          {/* Bottom Flanker */}
          <div className="absolute bottom-2">
            {renderBirdIcon(flankDirections[3])}
          </div>
        </div>

        {/* On-Screen Touch Controls */}
        <div className="grid grid-cols-3 gap-3 w-48 sm:w-56 mt-6">
          <div />
          <button
            onClick={() => handleInput('UP')}
            disabled={isPaused}
            className="p-4 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
          >
            <ArrowUp className="w-6 h-6 text-black stroke-[2.5]" />
          </button>
          <div />

          <button
            onClick={() => handleInput('LEFT')}
            disabled={isPaused}
            className="p-4 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-black stroke-[2.5]" />
          </button>
          <button
            onClick={() => handleInput('DOWN')}
            disabled={isPaused}
            className="p-4 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
          >
            <ArrowDown className="w-6 h-6 text-black stroke-[2.5]" />
          </button>
          <button
            onClick={() => handleInput('RIGHT')}
            disabled={isPaused}
            className="p-4 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
          >
            <ArrowRight className="w-6 h-6 text-black stroke-[2.5]" />
          </button>
        </div>

        <p className="mt-6 text-xs text-neutral-600 font-bold font-mono text-center">
          Klavye: <span className="text-black font-black">Ok Tuşları</span> veya <span className="text-black font-black">W, A, S, D</span>
        </p>
      </div>

      {isGameOver && finalMetrics && (
        <GameOverModal
          score={finalMetrics.score}
          accuracy={finalMetrics.accuracy}
          avgReactionMs={finalMetrics.avgReactionMs}
          maxLevel={finalMetrics.maxLevel}
          bpiEarned={finalMetrics.bpiEarned}
          bpiDelta={finalMetrics.bpiDelta}
          category="Dikkat & Odak"
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
            const initialTime = difficultyRef.current === 'EASY' ? 60 : difficultyRef.current === 'HARD' ? 35 : 45;
            setTimeLeft(initialTime);
            setTotalAttempts(0);
            setCorrectAttempts(0);
            setReactionTimes([]);
            generateNewFlock(1, difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
