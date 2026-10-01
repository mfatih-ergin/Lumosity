import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Sparkles, Check, X } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface WordChallenge {
  prefix: string;
  correctWord: string;
  completion: string;
  distractors: string[];
}

const WORD_DATABASE: WordChallenge[] = [
  { prefix: 'BİL', correctWord: 'BİLGİSAYAR', completion: 'GİSAYAR', distractors: ['MAÇIK', 'ŞANBA', 'REZLİK'] },
  { prefix: 'KİT', correctWord: 'KİTAPLIK', completion: 'APLIK', distractors: ['LANÇ', 'ÜĞME', 'ŞEŞİ'] },
  { prefix: 'DEN', correctWord: 'DENEYSEL', completion: 'EYSEL', distractors: ['İZBA', 'UKLUK', 'AĞIR'] },
  { prefix: 'GÖZ', correctWord: 'GÖZLEM', completion: 'LEM', distractors: ['TAYI', 'GANA', 'KÜLTÜ'] },
  { prefix: 'SAN', correctWord: 'SANATÇI', completion: 'ATÇI', distractors: ['DAK', 'PORİ', 'YUR'] },
  { prefix: 'YAZ', correctWord: 'YAZILIM', completion: 'ILIM', distractors: ['IŞKA', 'AĞUT', 'BOZA'] },
  { prefix: 'DÜŞ', correctWord: 'DÜŞÜNCE', completion: 'ÜNCE', distractors: ['ÜTME', 'ERSE', 'AYCI'] },
  { prefix: 'ÖĞR', correctWord: 'ÖĞRENCİ', completion: 'ENCİ', distractors: ['ALMA', 'EKME', 'UNLU'] },
  { prefix: 'BEY', correctWord: 'BEYİNCİK', completion: 'İNCİK', distractors: ['ANAT', 'UĞRA', 'İKİL'] },
  { prefix: 'HAZ', correctWord: 'HAZİNE', completion: 'İNE', distractors: ['URUM', 'ERBA', 'ANCI'] },
  { prefix: 'UZM', correctWord: 'UZMANLIK', completion: 'ANLIK', distractors: ['ALIK', 'AKÇA', 'ÜRLÜ'] },
  { prefix: 'BUL', correctWord: 'BULMACA', completion: 'MACA', distractors: ['UKÇA', 'INTI', 'ASAL'] },
  { prefix: 'ZİH', correctWord: 'ZİHİNSEL', completion: 'İNSEL', distractors: ['İRİK', 'ÜMRE', 'APRA'] },
  { prefix: 'FİK', correctWord: 'FİKİRLER', completion: 'İRLER', distractors: ['ANCI', 'ORBA', 'İLLİ'] },
  { prefix: 'HAF', correctWord: 'HAFIZALI', completion: 'IZALI', distractors: ['AFÇI', 'ATÜR', 'İRLİ'] },
];

interface WordBubblesGameProps {
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const WordBubblesGame: React.FC<WordBubblesGameProps> = ({
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
  const [currentChallenge, setCurrentChallenge] = useState<WordChallenge>(WORD_DATABASE[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [feedbackOption, setFeedbackOption] = useState<string | null>(null);
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

  const questionStartTimeRef = useRef<number>(Date.now());
  const finishGameRef = useRef<() => void>(() => {});

  const generateQuestion = useCallback((mode: DifficultyMode) => {
    const randomChallenge = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
    
    // Choose distractor count based on difficulty
    let distractorCount = 2; // Total 3 options
    if (mode === 'MEDIUM') distractorCount = 3; // Total 4 options
    if (mode === 'HARD') distractorCount = 4; // Total 5 options

    const pickedDistractors = [...randomChallenge.distractors]
      .sort(() => Math.random() - 0.5)
      .slice(0, distractorCount);

    // If needed more distractors, grab from other challenges
    while (pickedDistractors.length < distractorCount) {
      const other = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
      if (other.completion !== randomChallenge.completion && !pickedDistractors.includes(other.completion)) {
        pickedDistractors.push(other.completion);
      }
    }

    const allOpts = [randomChallenge.completion, ...pickedDistractors].sort(() => Math.random() - 0.5);

    setCurrentChallenge(randomChallenge);
    setOptions(allOpts);
    setFeedbackOption(null);
    setFeedbackType(null);
    questionStartTimeRef.current = Date.now();
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
      : 700;

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
        gameId: 'word-bubbles',
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

  const handleSelectOption = (option: string) => {
    if (isGameOverRef.current || isPausedRef.current) return;

    const reaction = Date.now() - questionStartTimeRef.current;
    reactionTimesRef.current.push(reaction);
    totalAttemptsRef.current += 1;
    setTotalAttempts(totalAttemptsRef.current);
    setReactionTimes([...reactionTimesRef.current]);

    setFeedbackOption(option);

    const isCorrect = option === currentChallenge.completion;

    if (isCorrect) {
      sounds.playCorrect(comboRef.current);
      setFeedbackType('CORRECT');
      correctAttemptsRef.current += 1;
      setCorrectAttempts(correctAttemptsRef.current);

      const newCombo = comboRef.current + 1;
      comboRef.current = newCombo;
      setCombo(newCombo);

      const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
      const speedBonus = Math.max(0, Math.floor((1500 - reaction) / 10));
      const points = Math.round((120 + newCombo * 20 + speedBonus) * multiplier);
      scoreRef.current += points;
      setScore(scoreRef.current);

      if (newCombo % 5 === 0) {
        sounds.playLevelUp();
        levelRef.current += 1;
        setLevel(levelRef.current);
      }

      setTimeout(() => {
        generateQuestion(difficultyRef.current);
      }, 250);
    } else {
      sounds.playWrong();
      setFeedbackType('WRONG');
      comboRef.current = 0;
      setCombo(0);

      setTimeout(() => {
        setFeedbackOption(null);
        setFeedbackType(null);
      }, 350);
    }
  };

  const startGameWithDifficulty = (mode: DifficultyMode) => {
    setDifficulty(mode);
    difficultyRef.current = mode;
    const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
    setTimeLeft(initialTime);
    generateQuestion(mode);
  };

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle="Word Bubbles"
        category="Dil"
        description="Ekranda verilen başlangıç köküne uygun tamamlayıcı heceyi seçin. Anlamlı Türkçe bilişsel sözcükleri hızlıca oluşturun!"
        onSelectDifficulty={startGameWithDifficulty}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: '3 seçenek ve rahat süre ile temel sözel tamamlama ve kelime tanıma.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Geniş okuma ve düşünme süresi)' },
              { strong: 'Seçenek Sayısı:', text: '3 Seçenek (1 doğru, 2 çeldirici)' },
              { strong: 'Sözcük Yapısı:', text: 'Günlük yaygın Türkçe kelimeler' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: '4 seçenek ile klasik Lumosity sözel akıcılık ve kelime dağarcığı temposu.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart dil temposu)' },
              { strong: 'Seçenek Sayısı:', text: '4 Seçenek (1 doğru, 3 çeldirici)' },
              { strong: 'Sözel Hız:', text: 'Kelimeleri zihinsel sözlükte anında tarama' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: '5 seçenek, 35 saniye süre ve kafa karıştırıcı benzer heceler.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Hızlı karar gereksinimi)' },
              { strong: 'Seçenek Sayısı:', text: '5 Seçenek (1 doğru, 4 yakın çeldirici)' },
              { strong: 'Yanıltıcı Ekler:', text: 'Birbirine benzeyen hece alternatifleri' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Kökü okuduktan sonra zihninizde ilk canlanan anlamlı eki bulmaya odaklanın!
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center select-none text-black animate-fade-in">
      <GameHeader
        title="Word Bubbles"
        category="Dil"
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

      <div className="w-full bg-white rounded-3xl p-6 sm:p-10 border-[2.5px] border-black transition-all shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden">
        
        {/* Banner */}
        <div className="mb-4 px-4 py-1.5 rounded-xl bg-[#51cf66] border-2 border-black text-black text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
          <BookOpen className="w-4 h-4 stroke-[2.5]" />
          <span>DOĞRU TAMAMLAYICI HECEYİ SEÇEREK KELİMEYİ KUR!</span>
        </div>

        {/* Word Prefix Display Box */}
        <div className="w-full max-w-sm p-6 rounded-3xl border-[3px] border-black bg-[#fffdf5] shadow-[5px_5px_0px_0px_#000] flex flex-col items-center justify-center my-4">
          <span className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1">
            KELİME BAŞLANGICI
          </span>
          <div className="flex items-center gap-2">
            <span className="text-4xl sm:text-5xl font-black text-black tracking-widest font-mono">
              {currentChallenge.prefix}
            </span>
            <span className="text-4xl sm:text-5xl font-black text-neutral-300 font-mono">
              ...
            </span>
          </div>
        </div>

        {/* Bubble Option Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mt-4">
          {options.map((opt, idx) => {
            const isSelected = feedbackOption === opt;
            const isCorrect = isSelected && feedbackType === 'CORRECT';
            const isWrong = isSelected && feedbackType === 'WRONG';

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(opt)}
                disabled={isPaused}
                className={`px-6 py-4 rounded-2xl border-2 border-black font-black text-lg sm:text-xl font-mono transition-all cursor-pointer shadow-[3px_3px_0px_0px_#000] hover:scale-105 active:scale-95 ${
                  isCorrect
                    ? 'bg-[#51cf66] text-black scale-110 shadow-[4px_4px_0px_0px_#000]'
                    : isWrong
                    ? 'bg-[#ff6b6b] text-black scale-95 shadow-[1px_1px_0px_0px_#000]'
                    : 'bg-[#fffdf5] hover:bg-amber-100 text-black'
                }`}
              >
                +{opt}
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-xs text-neutral-600 font-bold font-mono text-center">
          Doğru heceyi seçtiğinizde tam kelime: <span className="text-black font-black">{currentChallenge.prefix} + doğru ek</span>
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
          category="Dil"
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
            generateQuestion(difficultyRef.current);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
