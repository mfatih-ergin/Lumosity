import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Zap, ArrowLeft, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface ShapeCard {
  id: string;
  name: string;
  symbol: string;
  color: string;
  bgClass: string;
}

const EASY_SHAPES: ShapeCard[] = [
  { id: 'square', name: 'Mavi Kare', symbol: '■', color: '#3b82f6', bgClass: 'bg-blue-100 border-blue-600 text-blue-600' },
  { id: 'circle', name: 'Kırmızı Daire', symbol: '●', color: '#ef4444', bgClass: 'bg-red-100 border-red-600 text-red-600' },
  { id: 'triangle', name: 'Yeşil Üçgen', symbol: '▲', color: '#10b981', bgClass: 'bg-emerald-100 border-emerald-600 text-emerald-600' },
];

const MEDIUM_SHAPES: ShapeCard[] = [
  ...EASY_SHAPES,
  { id: 'diamond', name: 'Sarı Baklava', symbol: '◆', color: '#f59e0b', bgClass: 'bg-amber-100 border-amber-600 text-amber-600' },
  { id: 'star', name: 'Mor Yıldız', symbol: '★', color: '#a855f7', bgClass: 'bg-purple-100 border-purple-600 text-purple-600' },
  { id: 'heart', name: 'Pembe Kalp', symbol: '♥', color: '#ec4899', bgClass: 'bg-pink-100 border-pink-600 text-pink-600' },
];

const HARD_SHAPES: ShapeCard[] = [
  ...MEDIUM_SHAPES,
  { id: 'cross', name: 'Teal Artı', symbol: '✚', color: '#14b8a6', bgClass: 'bg-teal-100 border-teal-600 text-teal-600' },
  { id: 'moon', name: 'İndigo Hilal', symbol: '☽', color: '#6366f1', bgClass: 'bg-indigo-100 border-indigo-600 text-indigo-600' },
  { id: 'clover', name: 'Turuncu Yonca', symbol: '♣', color: '#f97316', bgClass: 'bg-orange-100 border-orange-600 text-orange-600' },
];

interface SpeedMatchGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const SpeedMatchGame: React.FC<SpeedMatchGameProps> = ({
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

  // Cards state
  const [previousCard, setPreviousCard] = useState<ShapeCard | null>(null);
  const [currentCard, setCurrentCard] = useState<ShapeCard | null>(null);
  const [isFirstCard, setIsFirstCard] = useState(true);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

  // Performance metrics tracking
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

  const getShapePool = useCallback((mode: DifficultyMode) => {
    switch (mode) {
      case 'EASY': return EASY_SHAPES;
      case 'HARD': return HARD_SHAPES;
      case 'MEDIUM':
      default: return MEDIUM_SHAPES;
    }
  }, []);

  const generateNextCard = useCallback((prev: ShapeCard | null, mode: DifficultyMode) => {
    const pool = getShapePool(mode);
    if (!prev) {
      const first = pool[Math.floor(Math.random() * pool.length)];
      setCurrentCard(first);
      setIsFirstCard(true);
      return;
    }

    // 50% probability of matching previous card
    const shouldMatch = Math.random() < 0.5;
    if (shouldMatch) {
      setCurrentCard(prev);
    } else {
      const others = pool.filter((s) => s.id !== prev.id);
      const next = others[Math.floor(Math.random() * others.length)];
      setCurrentCard(next);
    }
    setIsFirstCard(false);
    roundStartTimeRef.current = Date.now();
  }, [getShapePool]);

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
        gameId: 'speed-match',
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

  // Handle player choice (YES / NO)
  const handleAnswer = useCallback((playerSaidMatch: boolean) => {
    if (isGameOverRef.current || isPausedRef.current || isFirstCard || !previousCard || !currentCard) {
      // First card only needs to be acknowledged
      if (isFirstCard && currentCard) {
        sounds.playClick();
        setPreviousCard(currentCard);
        generateNextCard(currentCard, difficultyRef.current);
      }
      return;
    }

    const reaction = Date.now() - roundStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setTotalAttempts(totalAttemptsRef.current);
    setReactionTimes([...reactionTimesRef.current]);

    const actuallyMatches = previousCard.id === currentCard.id;
    const isCorrect = playerSaidMatch === actuallyMatches;

    if (isCorrect) {
      sounds.playCorrect(comboRef.current);
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);
      setFeedback('CORRECT');

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const speedBonus = Math.max(0, Math.floor((1000 - reaction) / 10));
      const points = Math.round((100 + newCombo * 20 + speedBonus) * multiplier);
      scoreRef.current += points;
      setScore(scoreRef.current);

      if (newCombo % 6 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }
    } else {
      sounds.playWrong();
      setFeedback('WRONG');
      comboRef.current = 0;
      setCombo(0);
    }

    // Advance: current becomes previous
    setPreviousCard(currentCard);
    generateNextCard(currentCard, difficultyRef.current);
  }, [isFirstCard, previousCard, currentCard, generateNextCard]);

  // Keyboard navigation
  useEffect(() => {
    if (isPaused || !difficulty) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        handleAnswer(true); // AYNI
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        handleAnswer(false); // FARKLI
      } else if (e.code === 'Space' && isFirstCard) {
        e.preventDefault();
        handleAnswer(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer, isPaused, difficulty, isFirstCard]);

  const startGameWithDifficulty = (mode: DifficultyMode) => {
    setDifficulty(mode);
    difficultyRef.current = mode;
    const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
    setTimeLeft(initialTime);
    generateNextCard(null, mode);
  };

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle="Speed Match"
        category="İşlem Hızı"
        description="Ekrana gelen sembolü BİR ÖNCEKİ sembol ile karşılaştırın. Aynı mı yoksa farklı mı olduğunu şimşek hızında belirleyin!"
        onSelectDifficulty={startGameWithDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: '3 temel geometrik şekil ve rahat tempo ile temel görsel hız egzersizi.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Rahat yanıt penceresi)' },
              { strong: 'Sembol Havuzu:', text: '3 Temel Şekil (Kare, Daire, Üçgen)' },
              { strong: 'Renk Ayrımı:', text: 'Net ve zıt renkler' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik Lumosity Speed Match deneyimi; 6 farklı sembol ve dengeli tempo.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart işlem hızı)' },
              { strong: 'Sembol Havuzu:', text: '6 Zengin Sembol (Baklava, Yıldız, Kalp...)' },
              { strong: 'Eşleşme Oranı:', text: '%50 Dengeli olasılık' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: '10 karmaşık sembol, 35 saniye süre ve yüksek hızlı karar refleksi.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Şimşek hızında refleks)' },
              { strong: 'Sembol Havuzu:', text: '10 Çeşitli Geometrik Sembol' },
              { strong: 'Zihinsel Filtre:', text: 'Benzer semboller arasında anlık ayrıştırma' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Her zaman son gördüğünüz 2 kartı zihninizde tutun. Klavye için: <span className="underline font-bold">Sol Ok (←) = AYNI</span>, <span className="underline font-bold">Sağ Ok (→) = FARKLI</span>.
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none text-black animate-fade-in">
      <GameHeader
        title="Speed Match"
        category="İşlem Hızı"
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

      <div className={`w-full bg-white rounded-3xl p-6 sm:p-10 border-[2.5px] border-black transition-all duration-300 shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden ${
        feedback === 'CORRECT' ? 'ring-4 ring-[#4ecdc4]' : feedback === 'WRONG' ? 'ring-4 ring-[#ff6b6b]' : ''
      }`}>
        
        {/* Banner Indicator */}
        <div className="mb-4 px-4 py-1.5 rounded-xl bg-[#ffd43b] border-2 border-black text-black text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000]">
          {isFirstCard ? 'İLK KART: BİR SONRAKİ İÇİN AKLINDA TUT' : 'BU KART BİR ÖNCEKİ İLE AYNI MI?'}
        </div>

        {/* Card Display Area */}
        <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl border-[3px] border-black bg-[#fffdf5] shadow-[6px_6px_0px_0px_#000] flex flex-col items-center justify-center my-6 relative transition-transform">
          {currentCard && (
            <div className={`w-40 h-40 rounded-2xl border-2 border-black flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_#000] ${currentCard.bgClass} transition-transform hover:scale-105`}>
              <span className="text-7xl font-black select-none leading-none">
                {currentCard.symbol}
              </span>
              <span className="text-xs font-black uppercase mt-2 tracking-wider">
                {currentCard.name}
              </span>
            </div>
          )}
        </div>

        {/* Buttons / Controls */}
        {isFirstCard ? (
          <button
            onClick={() => handleAnswer(true)}
            className="w-full max-w-sm py-3.5 rounded-2xl bg-[#ffd43b] hover:bg-amber-300 border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Kartı Hafızaya Al ve Başla</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button
              onClick={() => handleAnswer(true)}
              disabled={isPaused}
              className="py-4 rounded-2xl bg-[#4ecdc4] hover:bg-[#38d9a9] border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>AYNI (←)</span>
            </button>

            <button
              onClick={() => handleAnswer(false)}
              disabled={isPaused}
              className="py-4 rounded-2xl bg-[#ff6b6b] hover:bg-[#fa5252] border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
            >
              <X className="w-5 h-5 stroke-[3]" />
              <span>FARKLI (→)</span>
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-neutral-600 font-bold font-mono text-center">
          Klavye: <span className="text-black font-black">Sol Ok (←) = AYNI</span> | <span className="text-black font-black">Sağ Ok (→) = FARKLI</span>
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
          category="İşlem Hızı"
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
            setPreviousCard(null);
            generateNextCard(null, difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
