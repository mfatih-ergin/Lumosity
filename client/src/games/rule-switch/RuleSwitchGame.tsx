import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Clock, Shuffle } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type RuleType = 'NUMBER' | 'LETTER'; // NUMBER: Odd/Even, LETTER: Vowel/Consonant

interface CardData {
  letter: string;
  number: number;
  isVowel: boolean;
  isEven: boolean;
}

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T'];

interface RuleSwitchGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const RuleSwitchGame: React.FC<RuleSwitchGameProps> = ({
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

  // Active Rule & Card
  const [activeRule, setActiveRule] = useState<RuleType>('NUMBER');
  const [currentCard, setCurrentCard] = useState<CardData>({ letter: 'A', number: 4, isVowel: true, isEven: true });
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [roundsOnCurrentRule, setRoundsOnCurrentRule] = useState(0);

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

  const generateCard = useCallback((mode: DifficultyMode, prevRounds: number, currentRule: RuleType) => {
    // Determine next rule
    let nextRule = currentRule;
    let nextRounds = prevRounds + 1;

    if (mode === 'EASY') {
      // Switches every 4 rounds
      if (nextRounds >= 4) {
        nextRule = currentRule === 'NUMBER' ? 'LETTER' : 'NUMBER';
        nextRounds = 0;
      }
    } else if (mode === 'HARD') {
      // Switches randomly with 65% chance
      nextRule = Math.random() < 0.65 ? (currentRule === 'NUMBER' ? 'LETTER' : 'NUMBER') : currentRule;
      nextRounds = 0;
    } else {
      // MEDIUM: Switches every 2 rounds
      if (nextRounds >= 2) {
        nextRule = currentRule === 'NUMBER' ? 'LETTER' : 'NUMBER';
        nextRounds = 0;
      }
    }

    const isVowel = Math.random() < 0.5;
    const letter = isVowel
      ? VOWELS[Math.floor(Math.random() * VOWELS.length)]
      : CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];

    const number = Math.floor(1 + Math.random() * 9); // 1..9
    const isEven = number % 2 === 0;

    setActiveRule(nextRule);
    setRoundsOnCurrentRule(nextRounds);
    setCurrentCard({ letter, number, isVowel, isEven });
    setFeedback(null);
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
        gameId: 'rule-switch',
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

  // Answer handler
  // Left Button: NUMBER -> TEK (ODD) | LETTER -> SESLİ (VOWEL)
  // Right Button: NUMBER -> ÇİFT (EVEN) | LETTER -> SESSİZ (CONSONANT)
  const handleAnswer = useCallback((chosenOption: 'LEFT' | 'RIGHT') => {
    if (isGameOverRef.current || isPausedRef.current) return;

    const reaction = Date.now() - roundStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setTotalAttempts(totalAttemptsRef.current);
    setReactionTimes([...reactionTimesRef.current]);

    let isCorrect = false;
    if (activeRule === 'NUMBER') {
      // Left = TEK (ODD), Right = ÇİFT (EVEN)
      const expected = currentCard.isEven ? 'RIGHT' : 'LEFT';
      isCorrect = chosenOption === expected;
    } else {
      // Left = SESLİ (VOWEL), Right = SESSİZ (CONSONANT)
      const expected = currentCard.isVowel ? 'LEFT' : 'RIGHT';
      isCorrect = chosenOption === expected;
    }

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
      const points = Math.round((110 + newCombo * 20 + speedBonus) * multiplier);
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

    generateCard(difficultyRef.current, roundsOnCurrentRule, activeRule);
  }, [activeRule, currentCard, roundsOnCurrentRule, generateCard]);

  // Keyboard controls
  useEffect(() => {
    if (isPaused || !difficulty) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        handleAnswer('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        handleAnswer('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer, isPaused, difficulty]);

  const startGameWithDifficulty = (mode: DifficultyMode) => {
    setDifficulty(mode);
    difficultyRef.current = mode;
    const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
    setTimeLeft(initialTime);
    generateCard(mode, 0, 'NUMBER');
  };

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle="Cognitive Switch"
        category="Esneklik"
        description="Kart üst bölmede belirdiğinde SAYI kuralına (Tek/Çift), alt bölmede belirdiğinde ise HARF kuralına (Sesli/Sessiz) göre hızlıca yanıt verin!"
        onSelectDifficulty={startGameWithDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Kural her 4 turda bir tahmin edilebilir şekilde değişir. Geniş tepki süresi.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Rahat geçiş süresi)' },
              { strong: 'Kural Değişimi:', text: 'Her 4 turda bir yumuşak geçiş' },
              { strong: 'Zihinsel Yük:', text: 'Düşük karmaşıklık, net kural uyarısı' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik Lumosity Brain Shift kuralı; her 2 turda bir aktif geçiş.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart esneklik temposu)' },
              { strong: 'Kural Değişimi:', text: 'Her 2 turda bir ritmik değişim' },
              { strong: 'Adaptasyon:', text: 'Zihinsel kural setini hızlıca güncelleme' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: 'Her turda anlık ve rastgele kural sıçramaları; üst düzey zihinsel esneklik.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Yüksek tempolu refleks)' },
              { strong: 'Kural Değişimi:', text: 'Her turda rastgele sürpriz geçiş (%65)' },
              { strong: 'Engelleme:', text: 'Eski kuralın etkisini anında sıfırlama' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Üstteki sarı kutu aktifken sadece sayıya (Tek/Çift) odaklanın; alttaki mor kutu aktifken sadece harfe (Sesli/Sessiz) odaklanın!
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none text-black animate-fade-in">
      <GameHeader
        title="Cognitive Switch"
        category="Esneklik"
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
        
        {/* Dual Rule Display Frame */}
        <div className="w-full max-w-sm space-y-3 my-2">
          
          {/* Top Zone: NUMBER RULE */}
          <div className={`p-4 rounded-2xl border-2 border-black transition-all text-center ${
            activeRule === 'NUMBER'
              ? 'bg-[#fde047] shadow-[4px_4px_0px_0px_#000] scale-105 font-black text-black ring-2 ring-black'
              : 'bg-neutral-100 opacity-40 shadow-none'
          }`}>
            <div className="text-[11px] uppercase tracking-wider font-mono">
              {activeRule === 'NUMBER' ? '⚡ AKTİF KURAL' : 'PASİF'}
            </div>
            <div className="text-base font-black">
              ÜST BÖLME: SAYI (TEK / ÇİFT)
            </div>
          </div>

          {/* Central Card Display */}
          <div className="w-48 h-32 mx-auto rounded-3xl border-[3px] border-black bg-[#fffdf5] shadow-[5px_5px_0px_0px_#000] flex items-center justify-center gap-4">
            <span className="text-5xl font-black text-purple-600 font-mono">
              {currentCard.letter}
            </span>
            <span className="text-5xl font-black text-amber-600 font-mono">
              {currentCard.number}
            </span>
          </div>

          {/* Bottom Zone: LETTER RULE */}
          <div className={`p-4 rounded-2xl border-2 border-black transition-all text-center ${
            activeRule === 'LETTER'
              ? 'bg-[#a78bfa] shadow-[4px_4px_0px_0px_#000] scale-105 font-black text-black ring-2 ring-black'
              : 'bg-neutral-100 opacity-40 shadow-none'
          }`}>
            <div className="text-[11px] uppercase tracking-wider font-mono">
              {activeRule === 'LETTER' ? '⚡ AKTİF KURAL' : 'PASİF'}
            </div>
            <div className="text-base font-black">
              ALT BÖLME: HARF (SESLİ / SESSİZ)
            </div>
          </div>

        </div>

        {/* Dynamic Buttons based on active rule */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-6">
          <button
            onClick={() => handleAnswer('LEFT')}
            disabled={isPaused}
            className="py-4 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_0px_#000] flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-40"
          >
            <span className="text-xs text-neutral-500 font-mono">← Sol Tuş</span>
            <span className="text-base font-black mt-0.5">
              {activeRule === 'NUMBER' ? 'TEK SAYI' : 'SESLİ HARF'}
            </span>
          </button>

          <button
            onClick={() => handleAnswer('RIGHT')}
            disabled={isPaused}
            className="py-4 rounded-2xl bg-[#fffdf5] hover:bg-amber-100 active:translate-x-[2px] active:translate-y-[2px] border-2 border-black text-black font-black text-sm shadow-[3px_3px_0px_0px_#000] flex flex-col items-center justify-center transition-all cursor-pointer disabled:opacity-40"
          >
            <span className="text-xs text-neutral-500 font-mono">Sağ Tuş →</span>
            <span className="text-base font-black mt-0.5">
              {activeRule === 'NUMBER' ? 'ÇİFT SAYI' : 'SESSİZ HARF'}
            </span>
          </button>
        </div>

        <p className="mt-6 text-xs text-neutral-600 font-bold font-mono text-center">
          Klavye: <span className="text-black font-black">Sol Ok (←) / Sağ Ok (→)</span> veya <span className="text-black font-black">A / D</span>
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
          category="Esneklik"
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
            generateCard(difficultyRef.current, 0, 'NUMBER');
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
