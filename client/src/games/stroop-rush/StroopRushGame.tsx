import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Check, 
  X, 
  Zap, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export type { DifficultyMode };

interface ColorDef {
  name: string;
  colorClass: string;
  hex: string;
}

const COLOR_PALETTE: ColorDef[] = [
  { name: 'KIRMIZI', colorClass: 'text-red-500', hex: '#ef4444' },
  { name: 'MAVİ', colorClass: 'text-blue-500', hex: '#3b82f6' },
  { name: 'YEŞİL', colorClass: 'text-emerald-500', hex: '#10b981' },
  { name: 'SARI', colorClass: 'text-amber-400', hex: '#fbbf24' },
  { name: 'MOR', colorClass: 'text-purple-500', hex: '#a855f7' },
];

const EASY_COLOR_PALETTE: ColorDef[] = COLOR_PALETTE.slice(0, 3); // Red, Blue, Green

interface StroopRushGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
  duelSeed?: string;
  onDuelScoreUpdate?: (score: number, combo: number, round: number) => void;
}

export const StroopRushGame: React.FC<StroopRushGameProps> = ({
  onExit,
  isWorkoutStep,
  onNextWorkoutStep,
  duelSeed,
  onDuelScoreUpdate,
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
  const [isGameOver, setIsGameOver] = useState(false);

  // Card question state
  const [topWord, setTopWord] = useState<ColorDef>(COLOR_PALETTE[0]);
  const [topColor, setTopColor] = useState<ColorDef>(COLOR_PALETTE[1]);
  const [bottomWord, setBottomWord] = useState<ColorDef>(COLOR_PALETTE[1]);
  const [bottomColor, setBottomColor] = useState<ColorDef | null>(null); // Used in HARD mode for dual conflict
  const [isMatch, setIsMatch] = useState(true);
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
  const difficultyRef = useRef<DifficultyMode>(isWorkoutStep ? 'MEDIUM' : 'MEDIUM');

  const questionStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  // Generate question according to selected difficulty mode
  const generateNewQuestion = useCallback((modeOverride?: DifficultyMode) => {
    const currentMode = modeOverride || difficultyRef.current;
    const palette = currentMode === 'EASY' ? EASY_COLOR_PALETTE : COLOR_PALETTE;

    // 50% match chance for the question rule
    const match = Math.random() < 0.5;

    let topWordObj: ColorDef;
    let topColorObj: ColorDef;

    if (currentMode === 'EASY') {
      // EASY MODE: 75% chance congruent (word meaning matches text ink color)
      const isCongruent = Math.random() < 0.75;
      topColorObj = palette[Math.floor(Math.random() * palette.length)];
      if (isCongruent) {
        topWordObj = topColorObj;
      } else {
        const nonMatching = palette.filter((c) => c.name !== topColorObj.name);
        topWordObj = nonMatching[Math.floor(Math.random() * nonMatching.length)];
      }
    } else {
      // MEDIUM & HARD: Full Stroop conflict (independent random text & ink)
      topWordObj = palette[Math.floor(Math.random() * palette.length)];
      topColorObj = palette[Math.floor(Math.random() * palette.length)];
    }

    let bottomWordObj: ColorDef;
    if (match) {
      // Bottom word equals top INK COLOR
      bottomWordObj = topColorObj;
    } else {
      const nonMatching = palette.filter((c) => c.name !== topColorObj.name);
      bottomWordObj = nonMatching[Math.floor(Math.random() * nonMatching.length)];
    }

    let bottomColorObj: ColorDef | null = null;
    if (currentMode === 'HARD') {
      // HARD MODE (Dual Stroop): Bottom box text is ALSO rendered in a conflicting ink color!
      const nonMatchingBottomColors = palette.filter((c) => c.name !== bottomWordObj.name);
      bottomColorObj = nonMatchingBottomColors[Math.floor(Math.random() * nonMatchingBottomColors.length)] || palette[0];
    }

    setTopWord(topWordObj);
    setTopColor(topColorObj);
    setBottomWord(bottomWordObj);
    setBottomColor(bottomColorObj);
    setIsMatch(match);
    setFeedback(null);
    questionStartTimeRef.current = Date.now();
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
    generateNewQuestion(mode);
  };

  // Initial question when started
  useEffect(() => {
    if (hasStarted) {
      generateNewQuestion();
    }
  }, [hasStarted, generateNewQuestion]);

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
        : 500;

    setIsGameOver(true);
    setFinalMetrics({
      score: finalScore,
      accuracy,
      avgReactionMs: avgReaction,
      maxLevel: finalLevel,
      bpiEarned: 620,
      bpiDelta: 0,
    });

    try {
      const savedData = await gamesApi.saveSession({
        gameId: 'stroop-rush',
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
          bpiEarned: savedData.session?.bpiEarned || 620,
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
      questionStartTimeRef.current += pausedDuration;
      pauseStartTimeRef.current = 0;
    }
  };

  // Game Timer (pauses when modal active)
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

  const handleAnswer = useCallback((answerIsMatch: boolean) => {
    if (isGameOverRef.current || !hasStarted || isPausedRef.current) return;

    const reaction = Date.now() - questionStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setReactionTimes([...reactionTimesRef.current]);
    setTotalAttempts(totalAttemptsRef.current);

    const isCorrect = answerIsMatch === isMatch;

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

      // Speed bonus: faster reaction -> extra points
      const speedBonus = Math.max(0, Math.floor((900 - reaction) / 8));
      const basePoints = 80 + newCombo * 15 + speedBonus;
      const points = Math.round(basePoints * multiplier);
      scoreRef.current += points;
      const newScore = scoreRef.current;
      setScore(newScore);

      if (onDuelScoreUpdate) {
        onDuelScoreUpdate(newScore, newCombo, totalAttemptsRef.current);
      }

      if (newCombo % 8 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }

      generateNewQuestion();
    } else {
      sounds.playWrong();
      setFeedback('WRONG');
      comboRef.current = 0;
      setCombo(0);
      generateNewQuestion();
    }
  }, [isMatch, hasStarted, onDuelScoreUpdate, generateNewQuestion]);

  // Keyboard controls
  useEffect(() => {
    if (!hasStarted || isPaused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        handleAnswer(true);
      } else if (['ArrowRight', 'KeyD', 'KeyK'].includes(e.code)) {
        e.preventDefault();
        handleAnswer(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, isPaused, handleAnswer]);

  // 1. Mode Selection Screen (when not started)
  if (!hasStarted) {
    return (
      <DifficultySelectionScreen
        gameTitle="Stroop Rush"
        category="İşlem Hızı & Esneklik"
        description="Zihinsel ketleme (inhibition) ve işlem hızınızı test etmek için uygun modu seçin."
        onSelectDifficulty={handleSelectDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Isınma ve hızlı beyin egzersizi için idealdir.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: '3 Temel Renk', text: '(Kırmızı, Mavi, Yeşil)' },
              { strong: '%75 Uyumlu Kelimeler', text: '(Yazı ve renk eşleşir)' },
              { text: 'Nötr alt kutu (Dikkati dağıtmaz)' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik Stroop testi ve dengeli zihinsel esneklik.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: '5 Renk Paleti', text: '' },
              { text: 'Tam Stroop çelişkisi (Kelime vs Mürekkep)' },
              { text: 'Klasik dengeli BPI kazancı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod (Çift Çelişki)',
            description: 'Hem üst hem alt kutuda yanıltıcı renkler bulunur!',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: '5 Renk Paleti', text: '' },
              { strong: 'Çift Stroop Çelişkisi', text: '(Alt kutu da renkli)' },
              { text: 'Maksimum BPI ve skor kazancı', highlight: true },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <>
            <strong className="text-white block mb-1">Stroop Etkisi & İpuçları:</strong>
            Beynimiz kelimeleri otomatik olarak okumaya programlıdır. Stroop testinde amacınız, beyninizin bu otomatik dürtüsünü bastırarak (inhibition) yalnızca istenen renge ve anlama odaklanmaktır.
          </>
        }
      />
    );
  }

  // 2. Active Game Surface
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none animate-fade-in text-black">
      <GameHeader
        title="Stroop Rush"
        category="İşlem Hızı & Esneklik"
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
        
        
        {/* Mode Multiplier Badge & Header */}
        <div className="w-full flex items-center justify-between mb-4 px-3.5 py-2 rounded-2xl bg-[#fffdf5] border-2 border-black text-xs font-mono shadow-[2px_2px_0px_0px_#000]">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full border border-black ${
              difficulty === 'EASY' ? 'bg-[#4ecdc4]' : difficulty === 'HARD' ? 'bg-[#ff6b6b] animate-pulse' : 'bg-[#ffd43b]'
            }`} />
            <span className="text-black font-black">
              {difficulty === 'EASY' ? 'KOLAY MOD (1.0x)' : difficulty === 'HARD' ? 'ZOR MOD (1.6x Çift Çelişki)' : 'ORTA MOD (1.25x)'}
            </span>
          </div>

          <span className="text-neutral-600 font-bold text-[11px]">
            45 Saniye Hız Testi
          </span>
        </div>

        {/* Hard Mode Dual Conflict Warning Banner */}
        {difficulty === 'HARD' && (
          <div className="mb-4 w-full px-3 py-2 rounded-xl bg-[#ffbe76] border-2 border-black text-black text-[11px] font-mono flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]">
            <AlertTriangle className="w-4 h-4 text-black shrink-0 stroke-[2.5]" />
            <span className="font-bold">Alt kutunun <span className="underline font-black">yazı rengini yok sayın</span>, yalnızca <span className="underline font-black">kelime anlamına</span> odaklanın!</span>
          </div>
        )}

        {/* Instruction Badge */}
        <div className="mb-6 px-4 py-2 rounded-xl bg-[#ffd43b] border-2 border-black text-black text-xs font-black font-mono text-center shadow-[2px_2px_0px_0px_#000]">
          ÜST KELİMENİN <span className="underline">RENGİ</span>, ALT KELİMENİN <span className="underline">ANLAMIYLA</span> AYNI MI?
        </div>

        {/* Stroop Cards */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm my-4">
          
          {/* Top Card: Word printed with colored ink */}
          <div className="w-full p-6 rounded-2xl bg-[#fffdf5] border-2 border-black shadow-[4px_4px_0px_0px_#000] text-center flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-mono text-neutral-600 font-black mb-1">Üst Kelime (Yazı Rengine Odaklan)</span>
            <span
              className="text-4xl sm:text-5xl font-black tracking-wider transition-all duration-100 font-sans"
              style={{ color: topColor.hex }}
            >
              {topWord.name}
            </span>
          </div>

          <div className="text-black font-black font-mono text-xs flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>Kıyasla</span>
          </div>

          {/* Bottom Card: Meaning target (in HARD mode, has distracting font color) */}
          <div className="w-full p-6 rounded-2xl bg-[#fffdf5] border-2 border-black shadow-[4px_4px_0px_0px_#000] text-center flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase font-mono text-neutral-600 font-black mb-1">
              Alt Kelime ({difficulty === 'HARD' ? 'Sadece Anlama Odaklan' : 'Anlamı'})
            </span>
            <span 
              className="text-3xl sm:text-4xl font-black tracking-wider font-sans transition-all duration-100"
              style={{ color: bottomColor ? bottomColor.hex : '#000000' }}
            >
              {bottomWord.name}
            </span>
          </div>
        </div>

        {/* YES / NO Action Buttons */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-6">
          <button
            onClick={() => handleAnswer(true)}
            disabled={isPaused}
            className="py-4 rounded-2xl bg-[#4ecdc4] hover:bg-[#3db8af] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-black text-black font-black text-lg flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] transition-all cursor-pointer disabled:opacity-40"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>DOĞRU</span>
          </button>

          <button
            onClick={() => handleAnswer(false)}
            disabled={isPaused}
            className="py-4 rounded-2xl bg-[#ff6b6b] hover:bg-[#fa5252] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none border-2 border-black text-black font-black text-lg flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000] transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="w-6 h-6 stroke-[3]" />
            <span>YANLIŞ</span>
          </button>
        </div>

        <p className="mt-6 text-xs text-neutral-600 font-bold font-mono text-center">
          Klavye: <span className="text-black font-black">Sol Ok / J</span> (Doğru) &middot; <span className="text-black font-black">Sağ Ok / K</span> (Yanlış)
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
            setTimeLeft(45);
            setTotalAttempts(0);
            setCorrectAttempts(0);
            setReactionTimes([]);
            generateNewQuestion(difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
