import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Eye, Clock } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const ICONS_LIST = [
  '⭐', '🌙', '☀️', '⚡', '💎', '🔥', '💧', '🍀', '🌸', '❄️',
  '🎈', '🎯', '🪐', '🔮', '🍎', '🍄', '🚀', '🔑', '🎨', '🎵'
];

interface Cell {
  id: number;
  symbol: string;
  isUniqueTarget: boolean;
}

interface StarSearchGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const StarSearchGame: React.FC<StarSearchGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
}) => {
  const { user, updateUserBpi } = useAuthStore();

  const [difficulty, setDifficulty] = useState<DifficultyMode | null>(null);
  const difficultyRef = useRef<DifficultyMode>('MEDIUM');

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Grid state
  const [gridCells, setGridCells] = useState<Cell[]>([]);
  const [gridDim, setGridDim] = useState<number>(3); // 3x3, 4x4, 5x5
  const [feedbackCellId, setFeedbackCellId] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Performance tracking
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

  const roundStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  const generateGrid = useCallback((mode: DifficultyMode) => {
    let dim = 3; // 9 cells
    if (mode === 'MEDIUM') dim = 4; // 16 cells
    if (mode === 'HARD') dim = 5; // 25 cells

    setGridDim(dim);
    const totalCells = dim * dim;
    const pairCount = Math.floor((totalCells - 1) / 2);

    // Shuffle and pick symbols
    const shuffledIcons = [...ICONS_LIST].sort(() => Math.random() - 0.5);
    const targetSymbol = shuffledIcons[0];
    const pairSymbols = shuffledIcons.slice(1, 1 + pairCount);

    const cells: Cell[] = [];
    // 1 unique target
    cells.push({ id: 0, symbol: targetSymbol, isUniqueTarget: true });

    // Pairs
    let cellId = 1;
    pairSymbols.forEach((sym) => {
      cells.push({ id: cellId++, symbol: sym, isUniqueTarget: false });
      cells.push({ id: cellId++, symbol: sym, isUniqueTarget: false });
    });

    // Shuffle cell positions
    const randomized = cells.sort(() => Math.random() - 0.5).map((c, idx) => ({ ...c, id: idx }));

    setGridCells(randomized);
    setFeedbackCellId(null);
    setFeedbackType(null);
    roundStartTimeRef.current = Date.now();
  }, []);

  const finishGame = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const finalScore = scoreRef.current;
    const finalLevel = levelRef.current;
    const finalTotal = totalAttemptsRef.current;
    const finalCorrect = correctAttemptsRef.current;
    const finalReactions = reactionTimesRef.current;

    const accuracy = finalTotal > 0 ? finalCorrect / finalTotal : finalScore > 0 ? 1.0 : 0.5;
    const avgReaction = finalReactions.length > 0
      ? Math.round(finalReactions.reduce((a, b) => a + b, 0) / finalReactions.length)
      : 800;

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
        gameId: 'star-search',
        score: finalScore,
        rawAccuracy: accuracy,
        avgReactionMs: avgReaction,
        maxLevel: finalLevel,
      });

      if (savedData?.newOverallBpi && user) {
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

  // Main Timer
  useEffect(() => {
    if (isGameOver || isPaused || !difficulty) return;
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
  }, [isGameOver, isPaused, difficulty]);

  const handleCellClick = (cell: Cell) => {
    if (isGameOverRef.current || isPausedRef.current) return;

    const reaction = Date.now() - roundStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setTotalAttempts(totalAttemptsRef.current);
    setReactionTimes([...reactionTimesRef.current]);

    setFeedbackCellId(cell.id);

    if (cell.isUniqueTarget) {
      sounds.playCorrect(comboRef.current);
      setFeedbackType('CORRECT');
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const speedBonus = Math.max(0, Math.floor((1500 - reaction) / 10));
      const points = Math.round((120 + newCombo * 25 + speedBonus) * multiplier);
      scoreRef.current += points;
      setScore(scoreRef.current);

      if (newCombo % 4 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }

      setTimeout(() => {
        generateGrid(difficultyRef.current);
      }, 250);
    } else {
      sounds.playWrong();
      setFeedbackType('WRONG');
      comboRef.current = 0;
      setCombo(0);

      setTimeout(() => {
        setFeedbackCellId(null);
        setFeedbackType(null);
      }, 300);
    }
  };

  const startGameWithDifficulty = (mode: DifficultyMode) => {
    setDifficulty(mode);
    difficultyRef.current = mode;
    const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
    setTimeLeft(initialTime);
    generateGrid(mode);
  };

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle="Star Search"
        category="Dikkat & Odak"
        description="Izgaradaki sembolleri tarayın. Biri hariç tüm sembollerin bir çifti vardır; EŞİ OLMAYAN TEK BENZERSİZ SEMBOLÜ bulun!"
        onSelectDifficulty={startGameWithDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: '3x3 ızgara (9 sembol) ve rahat arama süresi ile görsel tarama temeli.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Rahat arama süresi)' },
              { strong: 'Izgara Boyutu:', text: '3x3 (Toplam 9 hücre - 4 çift, 1 tekil hedef)' },
              { strong: 'Görsel Karmaşa:', text: 'Düşük karmaşıklık, net ikonlar' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: '4x4 ızgara (16 sembol) ile klasik Lumosity görsel dikkat egzersizi.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart odak temposu)' },
              { strong: 'Izgara Boyutu:', text: '4x4 (Toplam 16 hücre - 7 çift, 1 tekil hedef)' },
              { strong: 'Tarama Alanı:', text: 'Dengeli periferal dikkat gereksinimi' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: '5x5 ızgara (25 sembol) ve 35 saniye ile en yüksek görsel dikkat meydan okuması.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Hızlı göz taraması)' },
              { strong: 'Izgara Boyutu:', text: '5x5 (Toplam 25 hücre - 12 çift, 1 tekil hedef)' },
              { strong: 'Görsel Yoğunluk:', text: 'Yoğun kalabalık içinde tekil hedef ayrıştırma' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Gözlerinizi satır satır veya spiral biçimde hızlıca gezdirin. İki tane gördüğünüz sembolleri hemen zihninizden eleyin!
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none text-black animate-fade-in">
      <GameHeader
        title="Star Search"
        category="Dikkat & Odak"
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        level={level}
        onExit={onExit}
        onPauseToggle={(p) => {
          setIsPaused(p);
          isPausedRef.current = p;
        }}
      />

      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border-[2.5px] border-black transition-all shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden">
        
        {/* Banner */}
        <div className="mb-4 px-4 py-1.5 rounded-xl bg-[#ffd43b] border-2 border-black text-black text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
          <Sparkles className="w-4 h-4 stroke-[2.5]" />
          <span>EŞİ OLMAYAN TEK VE BENZERSİZ SEMBOLÜ BUL VE TIKLA!</span>
        </div>

        {/* Grid Container */}
        <div 
          className={`grid gap-3 p-4 rounded-3xl border-2 border-black bg-[#fffdf5] shadow-[4px_4px_0px_0px_#000] ${
            gridDim === 3 ? 'grid-cols-3 w-72 h-72 sm:w-80 sm:h-80' :
            gridDim === 4 ? 'grid-cols-4 w-80 h-80 sm:w-96 sm:h-96' :
            'grid-cols-5 w-80 h-80 sm:w-[420px] sm:h-[420px]'
          }`}
        >
          {gridCells.map((cell) => {
            const isSelected = feedbackCellId === cell.id;
            const isCorrect = isSelected && feedbackType === 'CORRECT';
            const isWrong = isSelected && feedbackType === 'WRONG';

            return (
              <button
                key={cell.id}
                onClick={() => handleCellClick(cell)}
                disabled={isPaused}
                className={`rounded-2xl border-2 border-black flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000] hover:scale-105 active:scale-95 ${
                  isCorrect
                    ? 'bg-[#4ecdc4] scale-110 shadow-[3px_3px_0px_0px_#000]'
                    : isWrong
                    ? 'bg-[#ff6b6b] scale-95 shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-white hover:bg-amber-50'
                }`}
              >
                <span className={`select-none leading-none ${
                  gridDim === 3 ? 'text-4xl sm:text-5xl' :
                  gridDim === 4 ? 'text-3xl sm:text-4xl' :
                  'text-2xl sm:text-3xl'
                }`}>
                  {cell.symbol}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-neutral-600 font-bold font-mono text-center">
          İpucu: Her sembolün bir kopyası vardır. Sadece <span className="text-black font-black">1 tanesi</span> yalnızdır!
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
            generateGrid(difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
