import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layers, Sparkles, HelpCircle } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const ICONS_POOL = [
  '⚡', '💎', '🔥', '💧', '🍀', '🌸', '❄️', '⭐',
  '🌙', '☀️', '🚀', '🔮', '🍎', '🍄', '🎈', '🎯'
];

interface CardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const MemoryMatchGame: React.FC<MemoryMatchGameProps> = ({
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

  // Cards
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);

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

  const turnStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  const setupDeck = useCallback((mode: DifficultyMode) => {
    let pairCount = 3; // 6 cards
    if (mode === 'MEDIUM') pairCount = 6; // 12 cards
    if (mode === 'HARD') pairCount = 8; // 16 cards

    const shuffledIcons = [...ICONS_POOL].sort(() => Math.random() - 0.5).slice(0, pairCount);
    const deckSymbols = [...shuffledIcons, ...shuffledIcons].sort(() => Math.random() - 0.5);

    const deckCards: CardItem[] = deckSymbols.map((sym, index) => ({
      id: index,
      symbol: sym,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(deckCards);
    setSelectedCards([]);
    setIsChecking(false);
    turnStartTimeRef.current = Date.now();
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
        gameId: 'memory-match',
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

  const handleCardClick = (cardId: number) => {
    if (isGameOverRef.current || isPausedRef.current || isChecking) return;

    const targetCard = cards.find((c) => c.id === cardId);
    if (!targetCard || targetCard.isFlipped || targetCard.isMatched) return;

    sounds.playClick();

    // Flip card
    const updated = cards.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c));
    setCards(updated);

    const newSelected = [...selectedCards, cardId];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setIsChecking(true);
      const [firstId, secondId] = newSelected;
      const firstCard = updated.find((c) => c.id === firstId)!;
      const secondCard = updated.find((c) => c.id === secondId)!;

      const reaction = Date.now() - turnStartTimeRef.current;
      reactionTimesRef.current.push(reaction);
      totalAttemptsRef.current += 1;
      setTotalAttempts(totalAttemptsRef.current);
      setReactionTimes([...reactionTimesRef.current]);

      const isMatch = firstCard.symbol === secondCard.symbol;

      if (isMatch) {
        sounds.playCorrect(comboRef.current);
        correctAttemptsRef.current += 1;
        setCorrectAttempts(correctAttemptsRef.current);

        const newCombo = comboRef.current + 1;
        comboRef.current = newCombo;
        setCombo(newCombo);

        const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
        const points = Math.round((150 + newCombo * 30) * multiplier);
        scoreRef.current += points;
        setScore(scoreRef.current);

        setTimeout(() => {
          const matchedDeck = updated.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          );
          setCards(matchedDeck);
          setSelectedCards([]);
          setIsChecking(false);
          turnStartTimeRef.current = Date.now();

          // Check if board cleared
          const allMatched = matchedDeck.every((c) => c.isMatched);
          if (allMatched) {
            sounds.playLevelUp();
            levelRef.current += 1;
            setLevel(levelRef.current);
            setTimeout(() => setupDeck(difficultyRef.current), 500);
          }
        }, 300);
      } else {
        sounds.playWrong();
        comboRef.current = 0;
        setCombo(0);

        const flipDelay = difficultyRef.current === 'HARD' ? 500 : 800;
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
            )
          );
          setSelectedCards([]);
          setIsChecking(false);
          turnStartTimeRef.current = Date.now();
        }, flipDelay);
      }
    }
  };

  const startGameWithDifficulty = (mode: DifficultyMode) => {
    setDifficulty(mode);
    difficultyRef.current = mode;
    const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
    setTimeLeft(initialTime);
    setupDeck(mode);
  };

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle="Memory Match"
        category="Hafıza"
        description="Kartları çevirerek eşleşen sembol çiftlerini bulun. Açılan kartların yerlerini aklınızda tutun ve minimum hamleyle masayı temizleyin!"
        onSelectDifficulty={startGameWithDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: '6 kart (3 çift) ve rahat süre ile temel görsel çalışma belleği egzersizi.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Geniş hafıza zamanı)' },
              { strong: 'Kart Sayısı:', text: '6 Kart (3 Çift - Hızlı tamamlama)' },
              { strong: 'Kapanma Süresi:', text: 'Yavaş (Kartları incelemeye vakit kalır)' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: '12 kart (6 çift) ile klasik Lumosity hafıza kartı eşleştirme seviyesi.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart odak temposu)' },
              { strong: 'Kart Sayısı:', text: '12 Kart (6 Çift - Dengeli zorluk)' },
              { strong: 'Görsel Konum:', text: 'Kart konumlarını uzamsal olarak hatırlama' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: '16 kart (8 çift) ve 35 saniye ile yüksek kapasiteli çalışma belleği testi.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Hızlı hafıza refleksi)' },
              { strong: 'Kart Sayısı:', text: '16 Kart (8 Çift - Yoğun bellek yükü)' },
              { strong: 'Kapanma Süresi:', text: 'Hızlı (Anlık konsantrasyon şart)' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Açılan her kartın simgesini ve masadaki konumunu zihninizde bir koordinat gibi kodlayın!
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none text-black animate-fade-in">
      <GameHeader
        title="Memory Match"
        category="Hafıza"
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
        <div className="mb-4 px-4 py-1.5 rounded-xl bg-[#4ecdc4] border-2 border-black text-black text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
          <Layers className="w-4 h-4 stroke-[2.5]" />
          <span>EŞLEŞEN KART ÇİFTLERİNİ BUL!</span>
        </div>

        {/* Card Grid */}
        <div 
          className={`grid gap-3 p-4 rounded-3xl border-2 border-black bg-[#fffdf5] shadow-[4px_4px_0px_0px_#000] ${
            cards.length === 6 ? 'grid-cols-3 w-72 sm:w-80' :
            cards.length === 12 ? 'grid-cols-4 w-80 sm:w-96' :
            'grid-cols-4 w-80 sm:w-[420px]'
          }`}
        >
          {cards.map((card) => {
            const isOpen = card.isFlipped || card.isMatched;

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={isPaused || isChecking || card.isMatched}
                className={`h-20 sm:h-24 rounded-2xl border-2 border-black flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000] ${
                  card.isMatched
                    ? 'bg-[#4ecdc4] opacity-80 scale-95 shadow-none'
                    : isOpen
                    ? 'bg-white scale-105 shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-[#ffd43b] hover:bg-amber-300 hover:scale-105 active:scale-95'
                }`}
              >
                {isOpen ? (
                  <span className="text-3xl sm:text-4xl select-none leading-none animate-fade-in">
                    {card.symbol}
                  </span>
                ) : (
                  <span className="text-xl sm:text-2xl font-black text-black font-mono opacity-40">
                    ?
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-neutral-600 font-bold font-mono text-center">
          Tüm çiftleri tamamlayarak bir sonraki seviyeye geçin ve kombo puanını katlayın!
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
          category="Hafıza"
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
            setupDeck(difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
