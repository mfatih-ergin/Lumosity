import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Sparkles, Check, X, Zap, Target } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface UniversalChallenge {
  prompt: string;
  leftOption: string;
  rightOption: string;
  correctAnswer: 'LEFT' | 'RIGHT';
  categoryLabel: string;
}

interface CognitiveUniversalGameProps {
  gameId: string;
  gameTitle: string;
  category: string;
  description: string;
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const CognitiveUniversalGame: React.FC<CognitiveUniversalGameProps> = ({
  gameId,
  gameTitle,
  category,
  description,
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

  // Challenge state
  const [challenge, setChallenge] = useState<UniversalChallenge | null>(null);
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);

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

  const challengeStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  const generateChallenge = useCallback((mode: DifficultyMode) => {
    // Generate context-aware cognitive challenges based on category/gameId
    let prompt = '';
    let leftOption = '';
    let rightOption = '';
    let correctAnswer: 'LEFT' | 'RIGHT' = 'LEFT';

    const isLeftCorrect = Math.random() < 0.5;
    correctAnswer = isLeftCorrect ? 'LEFT' : 'RIGHT';

    if (category.toUpperCase().includes('LOGIC') || category.toUpperCase().includes('MANTIK')) {
      const a = Math.floor(10 + Math.random() * 40);
      const b = Math.floor(5 + Math.random() * 25);
      const sum = a + b;
      prompt = `${a} + ${b} = ?`;
      const wrong = sum + (Math.random() < 0.5 ? 2 : -2);
      leftOption = isLeftCorrect ? `${sum}` : `${wrong}`;
      rightOption = isLeftCorrect ? `${wrong}` : `${sum}`;
    } else if (category.toUpperCase().includes('MEMORY') || category.toUpperCase().includes('HAFIZA')) {
      const symbols = ['⭐', '💎', '🔥', '💧', '🍀', '🌸', '⚡', '🌙'];
      const target = symbols[Math.floor(Math.random() * symbols.length)];
      const other = symbols.filter((s) => s !== target)[Math.floor(Math.random() * (symbols.length - 1))];
      prompt = `Hedef Sembolü Seç: [ ${target} ]`;
      leftOption = isLeftCorrect ? target : other;
      rightOption = isLeftCorrect ? other : target;
    } else if (category.toUpperCase().includes('SPEED') || category.toUpperCase().includes('HIZ')) {
      const dirs = ['YUKARI (↑)', 'AŞAĞI (↓)', 'SOL (←)', 'SAĞ (→)'];
      const target = dirs[Math.floor(Math.random() * dirs.length)];
      const other = dirs.filter((d) => d !== target)[0];
      prompt = `Eşleşen Yönü Hızla Tıkla: ${target}`;
      leftOption = isLeftCorrect ? target : other;
      rightOption = isLeftCorrect ? other : target;
    } else if (category.toUpperCase().includes('FLEXIBILITY') || category.toUpperCase().includes('ESNEKLİK')) {
      const rules = ['ÇİFT SAYI', 'TEK SAYI'];
      const activeRule = rules[Math.floor(Math.random() * rules.length)];
      const evenNum = 2 * Math.floor(1 + Math.random() * 20);
      const oddNum = 2 * Math.floor(1 + Math.random() * 20) + 1;
      prompt = `Kural: [ ${activeRule} ]`;
      const correctNum = activeRule === 'ÇİFT SAYI' ? evenNum : oddNum;
      const wrongNum = activeRule === 'ÇİFT SAYI' ? oddNum : evenNum;
      leftOption = isLeftCorrect ? `${correctNum}` : `${wrongNum}`;
      rightOption = isLeftCorrect ? `${wrongNum}` : `${correctNum}`;
    } else if (category.toUpperCase().includes('LANGUAGE') || category.toUpperCase().includes('DİL')) {
      const wordPairs = [
        { word: 'Gelişim', correct: 'İlerleme', wrong: 'Gerileme' },
        { word: 'Bilişsel', correct: 'Zihinsel', wrong: 'Bedensel' },
        { word: 'Hızlı', correct: 'Süratli', wrong: 'Ağır' },
        { word: 'Bellek', correct: 'Hafıza', wrong: 'Gözlem' },
        { word: 'Zirve', correct: 'Doruk', wrong: 'Dip' },
      ];
      const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
      prompt = `"${pair.word}" kelimesinin eş anlamlısı?`;
      leftOption = isLeftCorrect ? pair.correct : pair.wrong;
      rightOption = isLeftCorrect ? pair.wrong : pair.correct;
    } else {
      // Attention / default
      const colors = ['MAVİ', 'KIRMIZI', 'YEŞİL', 'SARI'];
      const target = colors[Math.floor(Math.random() * colors.length)];
      const other = colors.filter((c) => c !== target)[0];
      prompt = `Doğru Odağı Seç: ${target}`;
      leftOption = isLeftCorrect ? target : other;
      rightOption = isLeftCorrect ? other : target;
    }

    setChallenge({
      prompt,
      leftOption,
      rightOption,
      correctAnswer,
      categoryLabel: category,
    });
    setFeedback(null);
    challengeStartTimeRef.current = Date.now();
  }, [category]);

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
      : 600;

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
        gameId,
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

  const handleChoice = (choice: 'LEFT' | 'RIGHT') => {
    if (isGameOverRef.current || isPausedRef.current || !challenge) return;

    const reaction = Date.now() - challengeStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setTotalAttempts(totalAttemptsRef.current);
    setReactionTimes([...reactionTimesRef.current]);

    const isCorrect = choice === challenge.correctAnswer;

    if (isCorrect) {
      sounds.playCorrect(comboRef.current);
      setFeedback('CORRECT');
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const speedBonus = Math.max(0, Math.floor((1500 - reaction) / 10));
      const points = Math.round((110 + newCombo * 20 + speedBonus) * multiplier);
      scoreRef.current += points;
      setScore(scoreRef.current);

      if (newCombo % 5 === 0) {
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

    setTimeout(() => {
      generateChallenge(difficultyRef.current);
    }, 200);
  };

  // Keyboard navigation
  useEffect(() => {
    if (isPaused || !difficulty) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        handleChoice('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        handleChoice('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleChoice, isPaused, difficulty]);

  const startGameWithDifficulty = (mode: DifficultyMode) => {
    setDifficulty(mode);
    difficultyRef.current = mode;
    const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
    setTimeLeft(initialTime);
    generateChallenge(mode);
  };

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle={gameTitle}
        category={category}
        description={description}
        onSelectDifficulty={startGameWithDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Daha geniş süre ve sakin tempo ile bilişsel alıştırma deneyimi.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Rahat düşünme süresi)' },
              { strong: 'Zihinsel Yük:', text: 'Düşük karmaşıklık, net yönergeler' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik Lumosity standartlarında dengeli bilişsel tempo.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart odak temposu)' },
              { strong: 'Adaptif Zorluk:', text: 'Kombolara bağlı seviye ivmesi' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: '35 saniye süre ve yüksek hızlı karar gereksinimi ile sınırları zorlayın.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Yüksek tempolu refleks)' },
              { strong: 'Zaman Baskısı:', text: 'Şimşek hızında tepki bonusu' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Klavyenizdeki <span className="font-bold">Sol Ok (←)</span> veya <span className="font-bold">Sağ Ok (→)</span> tuşları ile de hızlıca seçim yapabilirsiniz.
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none text-black animate-fade-in">
      <GameHeader
        title={gameTitle}
        category={category}
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

      <div className={`w-full bg-white rounded-3xl p-6 sm:p-10 border-[2.5px] border-black transition-all shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden ${
        feedback === 'CORRECT' ? 'ring-4 ring-[#4ecdc4]' : feedback === 'WRONG' ? 'ring-4 ring-[#ff6b6b]' : ''
      }`}>
        
        {/* Banner */}
        <div className="mb-4 px-4 py-1.5 rounded-xl bg-[#ffd43b] border-2 border-black text-black text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
          <Brain className="w-4 h-4 stroke-[2.5]" />
          <span>HIZLI VE DOĞRU SEÇİMİ YAP!</span>
        </div>

        {/* Challenge Box */}
        {challenge && (
          <div className="w-full max-w-sm p-6 sm:p-8 rounded-3xl border-[3px] border-black bg-[#fffdf5] shadow-[5px_5px_0px_0px_#000] flex flex-col items-center justify-center my-4 text-center">
            <span className="text-xl sm:text-2xl font-black text-black font-mono leading-relaxed">
              {challenge.prompt}
            </span>
          </div>
        )}

        {/* Buttons */}
        {challenge && (
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-4">
            <button
              onClick={() => handleChoice('LEFT')}
              disabled={isPaused}
              className="py-4 px-3 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] border-2 border-black text-black font-black text-sm sm:text-base font-mono shadow-[3px_3px_0px_0px_#000] flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-40"
            >
              <span className="text-[10px] text-neutral-500 font-bold mb-1">← Sol Seçenek</span>
              <span className="text-base sm:text-lg font-black">{challenge.leftOption}</span>
            </button>

            <button
              onClick={() => handleChoice('RIGHT')}
              disabled={isPaused}
              className="py-4 px-3 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] border-2 border-black text-black font-black text-sm sm:text-base font-mono shadow-[3px_3px_0px_0px_#000] flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-40"
            >
              <span className="text-[10px] text-neutral-500 font-bold mb-1">Sağ Seçenek →</span>
              <span className="text-base sm:text-lg font-black">{challenge.rightOption}</span>
            </button>
          </div>
        )}

        <p className="mt-8 text-xs text-neutral-600 font-bold font-mono text-center">
          Klavye: <span className="text-black font-black">Sol Ok (←)</span> / <span className="text-black font-black">Sağ Ok (→)</span> veya <span className="text-black font-black">A / D</span>
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
          category={category}
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
            generateChallenge(difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
