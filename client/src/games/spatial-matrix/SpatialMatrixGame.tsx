import React, { useState, useEffect, useRef } from 'react';
import { 
  Lightbulb,
  Clock
} from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export type { DifficultyMode };

interface SpatialMatrixGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const SpatialMatrixGame: React.FC<SpatialMatrixGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
}) => {
  const { user, updateUserBpi } = useAuthStore();

  // Mode & Initialization state
  const [difficulty, setDifficulty] = useState<DifficultyMode | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState(false);

  // Game state
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [maxLives, setMaxLives] = useState(3);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);

  // Round pattern state
  const [gridSize, setGridSize] = useState(3);
  const [targetTiles, setTargetTiles] = useState<number[]>([]); // In HARD mode, order matters (index 0 = 1st step, 1 = 2nd step...)
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [wrongTiles, setWrongTiles] = useState<number[]>([]);
  const [missedTiles, setMissedTiles] = useState<number[]>([]);
  const [phase, setPhase] = useState<'MEMORIZE' | 'RECALL' | 'REVEAL'>('MEMORIZE');
  const [memorizeDurationMs, setMemorizeDurationMs] = useState(1550);
  const [memorizeProgressActive, setMemorizeProgressActive] = useState(false);

  // Easy mode hint state
  const [hintTile, setHintTile] = useState<number | null>(null);
  const [hintUsedThisRound, setHintUsedThisRound] = useState(false);

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
  const difficultyRef = useRef<DifficultyMode>(isWorkoutStep ? 'MEDIUM' : 'MEDIUM');

  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recallStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  // Difficulty multiplier & config
  const getDifficultyMultiplier = (mode: DifficultyMode) => {
    switch (mode) {
      case 'EASY': return 1.0;
      case 'MEDIUM': return 1.25;
      case 'HARD': return 1.6;
    }
  };

  // Lumosity Level & Duration Progression Formula
  const getLevelConfig = (currentLevel: number, mode: DifficultyMode) => {
    let size = 3;
    let tileCount = 3;

    if (currentLevel === 1) { size = 3; tileCount = 3; }
    else if (currentLevel === 2) { size = 3; tileCount = 4; }
    else if (currentLevel === 3) { size = 4; tileCount = 4; }
    else if (currentLevel === 4) { size = 4; tileCount = 5; }
    else if (currentLevel === 5) { size = 4; tileCount = 6; }
    else if (currentLevel === 6) { size = 5; tileCount = 6; }
    else if (currentLevel === 7) { size = 5; tileCount = 7; }
    else if (currentLevel === 8) { size = 5; tileCount = 8; }
    else if (currentLevel === 9) { size = 6; tileCount = 8; }
    else if (currentLevel === 10) { size = 6; tileCount = 9; }
    else if (currentLevel === 11) { size = 6; tileCount = 10; }
    else {
      size = Math.min(7, 6 + Math.floor((currentLevel - 11) / 3));
      tileCount = Math.min(Math.floor(size * size * 0.45), 10 + (currentLevel - 11));
    }

    // Adaptive Memorization Duration according to Mode:
    // EASY: +%35 more generous time (1100ms base + 350ms per tile)
    // MEDIUM: Standard Lumosity (800ms base + 250ms per tile)
    // HARD: Sequential recall (950ms base + 300ms per tile)
    let durationMs = 800 + (tileCount * 250);
    if (mode === 'EASY') {
      durationMs = 1100 + (tileCount * 350);
    } else if (mode === 'HARD') {
      durationMs = 950 + (tileCount * 300);
    }

    return { size, tileCount, durationMs };
  };

  // Start a new round
  const startNewRound = (currentLevel: number, modeOverride?: DifficultyMode) => {
    const currentMode = modeOverride || difficultyRef.current;
    const config = getLevelConfig(currentLevel, currentMode);
    const totalTiles = config.size * config.size;

    // Pick random unique target tiles (order preserved for HARD mode)
    const targets: number[] = [];
    while (targets.length < config.tileCount) {
      const idx = Math.floor(Math.random() * totalTiles);
      if (!targets.includes(idx)) {
        targets.push(idx);
      }
    }

    setGridSize(config.size);
    setTargetTiles(targets);
    setSelectedTiles([]);
    setWrongTiles([]);
    setMissedTiles([]);
    setPhase('MEMORIZE');
    setMemorizeDurationMs(config.durationMs);
    setMemorizeProgressActive(false);
    setHintTile(null);
    setHintUsedThisRound(false);

    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);

    // Trigger smooth CSS progress bar on next frame
    requestAnimationFrame(() => {
      setMemorizeProgressActive(true);
    });

    phaseTimerRef.current = setTimeout(() => {
      setPhase('RECALL');
      setMemorizeProgressActive(false);
      recallStartTimeRef.current = Date.now();
    }, config.durationMs);
  };

  // Start game with selected difficulty
  const handleSelectDifficulty = (mode: DifficultyMode) => {
    const livesForMode = mode === 'EASY' ? 4 : 3;
    setDifficulty(mode);
    difficultyRef.current = mode;
    setMaxLives(livesForMode);
    setLives(livesForMode);
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
    setFinalMetrics(null);

    startNewRound(1, mode);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  const finishGame = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);

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
        : 600;

    setIsGameOver(true);
    setFinalMetrics({
      score: finalScore,
      accuracy,
      avgReactionMs: avgReaction,
      maxLevel: finalLevel,
      bpiEarned: 600,
      bpiDelta: 0,
    });

    try {
      const savedData = await gamesApi.saveSession({
        gameId: 'spatial-matrix',
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
          bpiEarned: savedData.session?.bpiEarned || 600,
          bpiDelta: savedData.bpiDelta || 0,
        }));
      }
    } catch (err) {
      console.error('Session save error:', err);
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
      recallStartTimeRef.current += pausedDuration;
      pauseStartTimeRef.current = 0;
    }
  };

  // Main 45-second Game Timer (only active after mode selected and not paused)
  useEffect(() => {
    if (!hasStarted || isGameOver || isPaused) return;
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

  // Easy Mode Hint Action
  const handleUseHint = () => {
    if (
      difficultyRef.current !== 'EASY' ||
      phase !== 'RECALL' ||
      hintUsedThisRound ||
      isGameOverRef.current ||
      isPausedRef.current
    )
      return;

    const remainingTargets = targetTiles.filter((t) => !selectedTiles.includes(t));
    if (remainingTargets.length === 0) return;

    sounds.playClick();
    const picked = remainingTargets[Math.floor(Math.random() * remainingTargets.length)];
    setHintTile(picked);
    setHintUsedThisRound(true);

    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setHintTile(null);
    }, 1500);
  };

  // Handle tile click during recall
  const handleTileClick = (index: number) => {
    if (phase !== 'RECALL' || isGameOverRef.current || isPausedRef.current) return;
    if (selectedTiles.includes(index) || wrongTiles.includes(index)) return;

    const reaction = Date.now() - recallStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setReactionTimes([...reactionTimesRef.current]);
    setTotalAttempts(totalAttemptsRef.current);

    const isHardMode = difficultyRef.current === 'HARD';
    
    // In Hard Mode, player must click in exact sequential order (1 -> 2 -> 3...)
    // In Easy/Medium Mode, any unclicked target tile is valid
    let isCorrectStep = false;
    if (isHardMode) {
      const expectedIndex = targetTiles[selectedTiles.length];
      isCorrectStep = index === expectedIndex;
    } else {
      isCorrectStep = targetTiles.includes(index);
    }

    if (isCorrectStep) {
      // Correct tile clicked
      const updated = [...selectedTiles, index];
      setSelectedTiles(updated);
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);

      sounds.playCorrect(comboRef.current);

      // Check if all targets in this pattern were found
      if (updated.length === targetTiles.length) {
        sounds.playComboUp(comboRef.current + 1);
        const newCombo = comboRef.current + 1;
        comboRef.current = newCombo;
        setCombo(newCombo);

        const multiplier = getDifficultyMultiplier(difficultyRef.current);
        const points = Math.round((100 * levelRef.current + newCombo * 25) * multiplier);
        scoreRef.current += points;
        setScore(scoreRef.current);

        // Advance level
        const nextLevel = levelRef.current + 1;
        levelRef.current = nextLevel;
        setLevel(nextLevel);

        setTimeout(() => {
          if (!isGameOverRef.current) {
            startNewRound(nextLevel);
          }
        }, 500);
      }
    } else {
      // Wrong tile clicked (either wrong tile or wrong sequence in HARD mode)
      sounds.playWrong();
      const updatedWrong = [...wrongTiles, index];
      setWrongTiles(updatedWrong);
      comboRef.current = 0;
      setCombo(0);

      const updatedLives = lives - 1;
      setLives(updatedLives);

      // Identify which correct tiles were missed
      const missed = targetTiles.filter((t) => !selectedTiles.includes(t));
      setMissedTiles(missed);
      setPhase('REVEAL');

      if (updatedLives <= 0) {
        // Show missed tiles briefly before game over
        setTimeout(() => {
          finishGameRef.current();
        }, 1100);
      } else {
        // Show missed tiles briefly for learning before restarting level
        const dropLevel = Math.max(1, levelRef.current - 1);
        levelRef.current = dropLevel;
        setLevel(dropLevel);
        setTimeout(() => {
          if (!isGameOverRef.current) {
            startNewRound(dropLevel);
          }
        }, 1100);
      }
    }
  };

  const getGridPixelSize = () => {
    if (gridSize === 3) return '280px';
    if (gridSize === 4) return '340px';
    if (gridSize === 5) return '380px';
    if (gridSize === 6) return '420px';
    return '450px';
  };

  // 1. Difficulty Mode Selection Screen (Before round begins)
  if (!hasStarted) {
    return (
      <DifficultySelectionScreen
        gameTitle="Spatial Matrix"
        category="Uzamsal Hafıza Egzersizi"
        description="Zihninizdeki kısa süreli görsel matrisi test edin. Başlamak için uygun zorluk seviyesini seçin:"
        onSelectDifficulty={handleSelectDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Isınma ve rahat bir hafıza pratiği için idealdir.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: '4 Can Hakkı', text: '(Ekstra tolerans)' },
              { strong: '+%35 Daha Uzun', text: 'ezber süresi' },
              { strong: '1 İpucu (Hint)', text: 'butonu her tur' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Standart Lumosity algoritması ve dengeli zorluk.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: '3 Can Hakkı', text: '' },
              { text: 'Dinamik adaptif ezber süresi' },
              { text: 'Serbest sırada kare işaretleme' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod (Sıralı)',
            description: 'Kareleri beliren sıra numaralarına göre işaretleyin!',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: '3 Can Hakkı', text: '' },
              { strong: '1, 2, 3... Sıralı Hafıza', text: 'kuralı' },
              { text: 'Maksimum BPI ve skor kazancı', highlight: true },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
      />
    );
  }

  // 2. Active Game Surface
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none animate-fade-in">
      <GameHeader
        title="Spatial Matrix"
        category="Hafıza"
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        level={level}
        onExit={onExit}
        onPauseToggle={handlePauseToggle}
      />

      {/* Main Game Surface */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-10 border-[2.5px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden">

        {/* Phase Indicator, Mode Badge & Lives Header */}
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between w-full max-w-sm gap-2 px-4 py-2.5 rounded-2xl bg-[#fffdf5] border-2 border-black text-xs font-mono shadow-[2px_2px_0px_0px_#000]">
          
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full border border-black ${
              phase === 'MEMORIZE' ? 'bg-[#ffd43b] animate-ping' : phase === 'REVEAL' ? 'bg-[#ff6b6b]' : 'bg-[#4ecdc4]'
            }`} />
            <span className="text-black font-black">
              {phase === 'MEMORIZE'
                ? difficulty === 'HARD'
                  ? `1. SIRAYI AKLINDA TUT (${(memorizeDurationMs / 1000).toFixed(1)}s)`
                  : `1. DESENİ AKLINDA TUT (${(memorizeDurationMs / 1000).toFixed(1)}s)`
                : phase === 'REVEAL'
                ? 'KAÇIRILAN KARELER'
                : difficulty === 'HARD'
                ? `2. SIRAYLA BAS (${selectedTiles.length + 1}. ADIM)`
                : '2. KARELERİ İŞARETLE'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Easy Mode Hint Button */}
            {difficulty === 'EASY' && (
              <button
                onClick={handleUseHint}
                disabled={phase !== 'RECALL' || hintUsedThisRound || isGameOver || isPaused}
                className={`px-2.5 py-1 rounded-xl border-2 border-black text-[11px] font-black flex items-center gap-1 transition-all ${
                  hintUsedThisRound
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    : 'bg-[#ffd43b] hover:bg-amber-300 text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer'
                }`}
                title="Kalan bir hedef kareyi 1.5 saniye parlatır"
              >
                <Lightbulb className={`w-3.5 h-3.5 ${!hintUsedThisRound ? 'text-black animate-bounce' : 'text-neutral-400'}`} />
                <span>İpucu {hintUsedThisRound ? '(0)' : '(1)'}</span>
              </button>
            )}

            {/* Lives Indicator */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-neutral-600 font-bold mr-0.5">HAK:</span>
              {Array.from({ length: maxLives }).map((_, i) => (
                <span
                  key={i}
                  className={`w-3 h-3 rounded-full border border-black transition-all ${
                    i < lives ? 'bg-[#ff6b6b]' : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Memorization Progress Bar (Lumosity Countdown Bar) */}
        <div className="w-full max-w-sm h-3 rounded-full bg-white border-2 border-black overflow-hidden mb-5 p-0.5 shadow-[2px_2px_0px_0px_#000]">
          <div
            className={`h-full rounded-full bg-[#fde047] border-r-2 border-black ${
              phase === 'MEMORIZE' ? 'transition-all' : 'opacity-0'
            }`}
            style={{
              width: phase === 'MEMORIZE' && memorizeProgressActive ? '0%' : '100%',
              transitionDuration: phase === 'MEMORIZE' ? `${memorizeDurationMs}ms` : '0ms',
              transitionTimingFunction: 'linear',
            }}
          />
        </div>

        {/* Matrix Grid */}
        <div
          className="grid gap-2 sm:gap-2.5 p-4 rounded-3xl bg-white border-[2.5px] border-black max-w-full shadow-[5px_5px_0px_0px_#000]"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: getGridPixelSize(),
            height: getGridPixelSize(),
            maxWidth: '100%',
            aspectRatio: '1 / 1',
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => {
            const isTarget = targetTiles.includes(index);
            const targetOrder = isTarget ? targetTiles.indexOf(index) + 1 : 0;

            const isSelected = selectedTiles.includes(index);
            const selectedOrder = isSelected ? selectedTiles.indexOf(index) + 1 : 0;

            const isWrong = wrongTiles.includes(index);
            const isMissed = phase === 'REVEAL' && missedTiles.includes(index);
            const isHinted = hintTile === index;

            const showMemorize = phase === 'MEMORIZE' && isTarget;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleTileClick(index)}
                disabled={phase === 'MEMORIZE' || phase === 'REVEAL' || isPaused}
                className={`w-full h-full aspect-square rounded-2xl flex items-center justify-center font-black text-xl select-none cursor-pointer outline-none border-2 border-black transition-all duration-200 shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] ${
                  showMemorize
                    ? 'bg-[#ffd43b] text-black shadow-[3px_3px_0px_0px_#000]'
                    : isSelected
                    ? 'bg-[#4ecdc4] text-black shadow-[3px_3px_0px_0px_#000]'
                    : isWrong
                    ? 'bg-[#ff6b6b] text-black shadow-[3px_3px_0px_0px_#000]'
                    : isMissed
                    ? 'bg-[#ffbe76] text-black border-dashed animate-pulse'
                    : isHinted
                    ? 'bg-[#fde047] text-black border-dashed animate-bounce'
                    : 'bg-[#fbf7ee] hover:bg-amber-50 text-transparent'
                }`}
                style={{
                  boxSizing: 'border-box',
                  transform: 'none',
                }}
              >
                {/* Tile Content rendering (Sequential Numbers for Hard Mode) */}
                {showMemorize ? (
                  difficulty === 'HARD' ? (
                    <span className="text-xl sm:text-2xl font-black font-mono">{targetOrder}</span>
                  ) : (
                    ''
                  )
                ) : isSelected ? (
                  difficulty === 'HARD' ? (
                    <span className="text-sm sm:text-base font-black font-mono">{selectedOrder} ✓</span>
                  ) : (
                    '✓'
                  )
                ) : isWrong ? (
                  '✗'
                ) : isMissed ? (
                  difficulty === 'HARD' ? (
                    <span className="text-sm sm:text-base font-black font-mono">{targetOrder}</span>
                  ) : (
                    '○'
                  )
                ) : isHinted ? (
                  '💡'
                ) : (
                  ''
                )}
              </button>
            );
          })}
        </div>

        {/* Helper Hint */}
        <p className="mt-6 text-xs text-neutral-600 text-center font-bold font-mono">
          {phase === 'MEMORIZE'
            ? difficulty === 'HARD'
              ? `${targetTiles.length} hafıza karesi 1'den ${targetTiles.length}'e kadar sıralandı... Sırayı ezberle!`
              : `${targetTiles.length} hafıza karesi yanıyor... Süre bitince yerlerini hatırla!`
            : phase === 'REVEAL'
            ? 'Kaçırılan kareler gösteriliyor...'
            : difficulty === 'HARD'
            ? `Sıradaki: ${selectedTiles.length + 1}. kareye dokun! (${targetTiles.length - selectedTiles.length} kaldı)`
            : `${targetTiles.length - selectedTiles.length} karo kaldı.`}
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
            setLives(maxLives);
            setTotalAttempts(0);
            setCorrectAttempts(0);
            setReactionTimes([]);
            startNewRound(1);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
