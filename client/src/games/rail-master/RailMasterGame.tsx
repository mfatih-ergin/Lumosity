import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { GameHeader } from '../../components/game-engine/GameHeader';
import { GameOverModal } from '../../components/game-engine/GameOverModal';
import { DifficultySelectionScreen, DifficultyMode } from '../../components/game-engine/DifficultySelectionScreen';
import { sounds } from '../../services/soundEffects';
import { gamesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface SwitchNode {
  id: number;
  x: number;
  y: number;
  direction: 'TOP' | 'BOTTOM'; // which branch it currently directs to
}

interface Train {
  id: number;
  x: number;
  y: number;
  color: string;
  targetStation: number; // 0: Cyan, 1: Pink, 2: Amber, 3: Green
  speed: number;
  pathSegment: number;
  progress: number;
}

const STATION_COLORS = [
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Green', hex: '#10b981' },
];

export const RailMasterGame: React.FC<{
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}> = ({ onExit, isWorkoutStep, onNextWorkoutStep }) => {
  const { user, updateUserBpi } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Difficulty selection mode
  const [difficulty, setDifficulty] = useState<DifficultyMode | null>(null);
  const difficultyRef = useRef<DifficultyMode>('MEDIUM');

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isTimeUpBanner, setIsTimeUpBanner] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Performance metrics tracking with synchronous Refs to prevent stale closure bugs
  const [totalTrains, setTotalTrains] = useState(0);
  const [successfulTrains, setSuccessfulTrains] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [finalMetrics, setFinalMetrics] = useState<any>(null);

  // Game Engine Internal State in Refs for 60 FPS render loop
  const switchesRef = useRef<SwitchNode[]>([
    { id: 0, x: 200, y: 200, direction: 'TOP' },
    { id: 1, x: 400, y: 120, direction: 'TOP' },
    { id: 2, x: 400, y: 280, direction: 'TOP' },
  ]);

  const trainsRef = useRef<Train[]>([]);
  const nextTrainSpawnRef = useRef<number>(Date.now() + 1000);
  const lastSpawnTimeRef = useRef<number>(Date.now());
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const totalTrainsRef = useRef<number>(0);
  const successfulTrainsRef = useRef<number>(0);
  const reactionTimesRef = useRef<number[]>([]);
  const isGameOverRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const finishGameRef = useRef<() => void>(() => {});

  const finishGame = async () => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;
    setIsTimeUpBanner(true);

    const finalScore = scoreRef.current;
    const finalLevel = levelRef.current;
    const finalTotalTrains = totalTrainsRef.current;
    const finalSuccess = successfulTrainsRef.current;
    const finalReactions = reactionTimesRef.current;

    const accuracy =
      finalTotalTrains > 0
        ? finalSuccess / finalTotalTrains
        : finalScore > 0
        ? 1.0
        : 0.6;

    const avgReaction =
      finalReactions.length > 0
        ? Math.round(finalReactions.reduce((a, b) => a + b, 0) / finalReactions.length)
        : 800;

    let savedData: any = null;
    try {
      savedData = await gamesApi.saveSession({
        gameId: 'rail-master',
        score: finalScore,
        rawAccuracy: accuracy,
        avgReactionMs: avgReaction,
        maxLevel: finalLevel,
      });

      if (savedData && savedData.newOverallBpi && user) {
        updateUserBpi(savedData.newOverallBpi, savedData.user?.streakDays);
      }
    } catch (err) {
      console.error('Save session error:', err);
    }

    setTimeout(() => {
      setIsTimeUpBanner(false);
      setIsGameOver(true);
      setFinalMetrics({
        score: finalScore,
        accuracy,
        avgReactionMs: avgReaction,
        maxLevel: finalLevel,
        bpiEarned: savedData?.session?.bpiEarned || 600,
        bpiDelta: savedData?.bpiDelta || 0,
      });
    }, 2200);
  };

  finishGameRef.current = finishGame;

  const handlePauseToggle = (paused: boolean) => {
    setIsPaused(paused);
    isPausedRef.current = paused;
  };

  // Main Timer
  useEffect(() => {
    if (isGameOver || isTimeUpBanner || isPaused) return;
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

  // Canvas interaction (Toggle switches by clicking)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isGameOver || isPausedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check hit test on switches
    switchesRef.current.forEach((sw) => {
      const dist = Math.hypot(clickX - sw.x, clickY - sw.y);
      if (dist < 32) {
        sounds.playClick();
        sw.direction = sw.direction === 'TOP' ? 'BOTTOM' : 'TOP';
      }
    });
  };

  // 60 FPS Render & Simulation Loop
  useEffect(() => {
    let animId: number;

    const spawnTrain = () => {
      const activeDiff = difficultyRef.current || 'MEDIUM';
      
      // Target stations based on difficulty
      let target = 0;
      if (activeDiff === 'EASY') {
        // Only 2 stations in easy mode for lower cognitive load
        target = Math.floor(Math.random() * 2);
      } else {
        target = Math.floor(Math.random() * 4);
      }
      
      const color = STATION_COLORS[target].hex;
      
      // Speed based on difficulty
      let speed = 1.2 + levelRef.current * 0.25;
      if (activeDiff === 'EASY') {
        speed = 0.85 + levelRef.current * 0.12;
      } else if (activeDiff === 'HARD') {
        speed = 1.75 + levelRef.current * 0.35;
      }

      totalTrainsRef.current += 1;
      setTotalTrains(totalTrainsRef.current);

      trainsRef.current.push({
        id: Date.now() + Math.random(),
        x: 20,
        y: 200,
        color,
        targetStation: target,
        speed,
        pathSegment: 0,
        progress: 0,
      });

      lastSpawnTimeRef.current = Date.now();
      
      // Spawn interval based on difficulty
      let spawnInterval = 3000;
      if (activeDiff === 'EASY') {
        spawnInterval = Math.max(3000, 4800 - levelRef.current * 300);
      } else if (activeDiff === 'HARD') {
        spawnInterval = Math.max(1300, 2200 - levelRef.current * 200);
      } else {
        spawnInterval = Math.max(1800, 3500 - levelRef.current * 300);
      }
      nextTrainSpawnRef.current = Date.now() + spawnInterval;
    };

    const render = () => {
      if (isGameOverRef.current) return;

      if (isPausedRef.current) {
        animId = requestAnimationFrame(render);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw tracks
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Segment 0: Main entry to Switch 0
      ctx.beginPath();
      ctx.moveTo(20, 200);
      ctx.lineTo(200, 200);
      ctx.stroke();

      // Top Branch: Switch 0 to Switch 1
      ctx.beginPath();
      ctx.moveTo(200, 200);
      ctx.bezierCurveTo(280, 200, 320, 120, 400, 120);
      ctx.stroke();

      // Bottom Branch: Switch 0 to Switch 2
      ctx.beginPath();
      ctx.moveTo(200, 200);
      ctx.bezierCurveTo(280, 200, 320, 280, 400, 280);
      ctx.stroke();

      // Station 0 (Cyan - Top-Top): Switch 1 to Station 0
      ctx.beginPath();
      ctx.moveTo(400, 120);
      ctx.bezierCurveTo(460, 120, 500, 60, 580, 60);
      ctx.stroke();

      // Station 1 (Pink - Top-Bottom): Switch 1 to Station 1
      ctx.beginPath();
      ctx.moveTo(400, 120);
      ctx.bezierCurveTo(460, 120, 500, 150, 580, 150);
      ctx.stroke();

      // Station 2 (Amber - Bottom-Top): Switch 2 to Station 2
      ctx.beginPath();
      ctx.moveTo(400, 280);
      ctx.bezierCurveTo(460, 280, 500, 250, 580, 250);
      ctx.stroke();

      // Station 3 (Green - Bottom-Bottom): Switch 2 to Station 3
      ctx.beginPath();
      ctx.moveTo(400, 280);
      ctx.bezierCurveTo(460, 280, 500, 340, 580, 340);
      ctx.stroke();

      // 3. Draw Railway Switch Indicators
      switchesRef.current.forEach((sw) => {
        // Outer interactive glow ring
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Switch Center Core
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();

        // Direction Arrow Pointer
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.moveTo(sw.x, sw.y);
        if (sw.direction === 'TOP') {
          ctx.lineTo(sw.x + 14, sw.y - 12);
        } else {
          ctx.lineTo(sw.x + 14, sw.y + 12);
        }
        ctx.stroke();
      });

      // 4. Draw Stations (Destinations)
      const stations = [
        { x: 580, y: 60, target: 0 },
        { x: 580, y: 150, target: 1 },
        { x: 580, y: 250, target: 2 },
        { x: 580, y: 340, target: 3 },
      ];

      stations.forEach((st) => {
        const col = STATION_COLORS[st.target];
        // Station depot box
        ctx.fillStyle = col.hex;
        ctx.shadowColor = col.hex;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.roundRect(st.x - 10, st.y - 20, 50, 40, 10);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Depot label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(col.name, st.x + 15, st.y + 4);
      });

      // 5. Spawn logic
      if (Date.now() >= nextTrainSpawnRef.current) {
        spawnTrain();
      }

      // 6. Update and Draw Trains
      const updatedTrains: Train[] = [];
      const sw0 = switchesRef.current[0];
      const sw1 = switchesRef.current[1];
      const sw2 = switchesRef.current[2];

      trainsRef.current.forEach((train) => {
        train.progress += train.speed * 0.005;

        // Path routing logic
        if (train.pathSegment === 0) {
          // Entry Segment: (20, 200) -> (200, 200)
          train.x = 20 + train.progress * (200 - 20);
          train.y = 200;

          if (train.progress >= 1) {
            train.progress = 0;
            train.pathSegment = sw0.direction === 'TOP' ? 1 : 2;
          }
        } else if (train.pathSegment === 1) {
          // Upper branch: (200, 200) -> (400, 120)
          const t = train.progress;
          train.x = (1 - t) * (1 - t) * 200 + 2 * (1 - t) * t * 280 + t * t * 400;
          train.y = (1 - t) * (1 - t) * 200 + 2 * (1 - t) * t * 120 + t * t * 120;

          if (t >= 1) {
            train.progress = 0;
            train.pathSegment = sw1.direction === 'TOP' ? 3 : 4;
          }
        } else if (train.pathSegment === 2) {
          // Lower branch: (200, 200) -> (400, 280)
          const t = train.progress;
          train.x = (1 - t) * (1 - t) * 200 + 2 * (1 - t) * t * 280 + t * t * 400;
          train.y = (1 - t) * (1 - t) * 200 + 2 * (1 - t) * t * 280 + t * t * 280;

          if (t >= 1) {
            train.progress = 0;
            train.pathSegment = sw2.direction === 'TOP' ? 5 : 6;
          }
        } else if (train.pathSegment === 3) {
          // Station 0 branch: (400, 120) -> (580, 60)
          const t = train.progress;
          train.x = (1 - t) * (1 - t) * 400 + 2 * (1 - t) * t * 460 + t * t * 580;
          train.y = (1 - t) * (1 - t) * 120 + 2 * (1 - t) * t * 60 + t * t * 60;
        } else if (train.pathSegment === 4) {
          // Station 1 branch: (400, 120) -> (580, 150)
          const t = train.progress;
          train.x = (1 - t) * (1 - t) * 400 + 2 * (1 - t) * t * 460 + t * t * 580;
          train.y = (1 - t) * (1 - t) * 120 + 2 * (1 - t) * t * 150 + t * t * 150;
        } else if (train.pathSegment === 5) {
          // Station 2 branch: (400, 280) -> (580, 250)
          const t = train.progress;
          train.x = (1 - t) * (1 - t) * 400 + 2 * (1 - t) * t * 460 + t * t * 580;
          train.y = (1 - t) * (1 - t) * 280 + 2 * (1 - t) * t * 250 + t * t * 250;
        } else if (train.pathSegment === 6) {
          // Station 3 branch: (400, 280) -> (580, 340)
          const t = train.progress;
          train.x = (1 - t) * (1 - t) * 400 + 2 * (1 - t) * t * 460 + t * t * 580;
          train.y = (1 - t) * (1 - t) * 280 + 2 * (1 - t) * t * 340 + t * t * 340;
        }

        // Draw Train Body
        ctx.fillStyle = train.color;
        ctx.shadowColor = train.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(train.x, train.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Train light core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(train.x + 3, train.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Check if train reached terminal
        if (train.pathSegment >= 3 && train.progress >= 1) {
          const reachedStation = train.pathSegment - 3;
          const isSuccess = reachedStation === train.targetStation;

          if (isSuccess) {
            sounds.playCorrect(comboRef.current);
            successfulTrainsRef.current += 1;
            setSuccessfulTrains(successfulTrainsRef.current);

            const newCombo = comboRef.current + 1;
            comboRef.current = newCombo;
            setCombo(newCombo);

            const multiplier = difficultyRef.current === 'HARD' ? 1.6 : difficultyRef.current === 'MEDIUM' ? 1.25 : 1.0;
            const points = Math.round((120 + newCombo * 25 + levelRef.current * 20) * multiplier);
            scoreRef.current += points;
            setScore(scoreRef.current);

            if (newCombo % 5 === 0) {
              sounds.playLevelUp();
              levelRef.current += 1;
              setLevel(levelRef.current);
            }
          } else {
            sounds.playWrong();
            comboRef.current = 0;
            setCombo(0);
          }
        } else {
          updatedTrains.push(train);
        }
      });

      trainsRef.current = updatedTrains;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isGameOver]);

  if (!difficulty) {
    return (
      <DifficultySelectionScreen
        gameTitle="Rail Master"
        category="Mantık & Rota Planlama"
        description="Ray makaslarını anlık olarak değiştirerek trenleri kendi renklerindeki istasyonlara güvenle ulaştırın. İleriye dönük rota planlamanızı test edin."
        onSelectDifficulty={(mode) => {
          setDifficulty(mode);
          difficultyRef.current = mode;
          const initialTime = mode === 'EASY' ? 60 : mode === 'HARD' ? 35 : 45;
          setTimeLeft(initialTime);
          nextTrainSpawnRef.current = Date.now() + 800;
        }}
        onExit={onExit}
        options={{
          EASY: {
            title: 'Kolay Mod',
            description: 'Daha yavaş trenler ve sakin ray akışı ile rahat rota planlaması.',
            multiplierBadge: '1.0x Puan',
            features: [
              { strong: 'Süre:', text: '60 Saniye (Rahat planlama süresi)' },
              { strong: 'Tren Hızı:', text: 'Yavaş & Kontrollü (0.8x Başlangıç hızı)' },
              { strong: 'Tren Sıklığı:', text: 'Geniş Aralıklar (Trenler tek tek gelir)' },
              { strong: 'İstasyon Sayısı:', text: 'Sadeleştirilmiş (2 ana renk istasyonu)' },
              { strong: 'Puan Çarpanı:', text: '1.0x Temel BPI' },
            ],
            buttonText: 'Kolay Modda Başla',
          },
          MEDIUM: {
            title: 'Orta Mod (Klasik)',
            description: 'Klasik Lumosity Train of Thought deneyimi; 4 renkli istasyon ve 3 makas.',
            multiplierBadge: '1.25x Puan',
            badgeExtra: 'ÖNERİLEN',
            features: [
              { strong: 'Süre:', text: '45 Saniye (Standart mantık temposu)' },
              { strong: 'Tren Hızı:', text: 'Standart (1.2x Hız ve seviye ivmesi)' },
              { strong: 'Tren Sıklığı:', text: 'Dengeli (Aynı anda 2 tren yolda olabilir)' },
              { strong: 'İstasyon Sayısı:', text: '4 Tam Renkli İstasyon' },
              { strong: 'Puan Çarpanı:', text: '1.25x BPI Çarpanı' },
            ],
            buttonText: 'Orta Modda Başla',
          },
          HARD: {
            title: 'Zor Mod',
            description: 'Şimşek hızında trenler, peş peşe çıkan vagonlar ve keskin makas yönetimi.',
            multiplierBadge: '1.6x Puan',
            features: [
              { strong: 'Süre:', text: '35 Saniye (Yüksek adrenalinli rota yönetimi)' },
              { strong: 'Tren Hızı:', text: 'Çok Hızlı (1.8x Başlangıç hızı)' },
              { strong: 'Tren Sıklığı:', text: 'Seri & Yoğun (Trenler 1.5 saniyede bir çıkar)' },
              { strong: 'Hata Payı:', text: 'Düşük (Anlık makas değiştirme refleksi gerektirir)' },
              { strong: 'Puan Çarpanı:', text: '1.6x BPI Çarpanı' },
            ],
            buttonText: 'Zor Modda Başla',
          },
        }}
        infoNote={
          <span>
            <strong className="text-black">İpucu:</strong> Trenlerin renklerine bakarak tünelden çıkmadan önce makasları doğru pozisyona ayarlayın. Mavi makas çemberlerine tıklayarak ray yönünü değiştirebilirsiniz.
          </span>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col items-center select-none text-black">
      <GameHeader
        title="Rail Master"
        category="Mantık & Rota Planlama"
        score={score}
        combo={combo}
        timeLeft={timeLeft}
        level={level}
        onExit={onExit}
        onPauseToggle={handlePauseToggle}
      />

      <div className="w-full bg-white rounded-3xl p-4 sm:p-6 border-[2.5px] border-black shadow-[6px_6px_0px_0px_#000] flex flex-col items-center relative overflow-hidden">
        
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
        
        {/* Banner */}
        <div className="mb-3 px-4 py-2 rounded-xl bg-[#fde047] border-2 border-black text-black text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000]">
          RAY MAKASLARINA TIKLAYARAK TRENLERİ EŞLEŞEN İSTASYONA YÖNLENDİR!
        </div>

        {/* 60 FPS HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          onClick={handleCanvasClick}
          className="w-full max-w-[640px] aspect-[16/10] rounded-2xl border-2 border-black bg-[#0a0f1d] cursor-pointer shadow-[3px_3px_0px_0px_#000]"
        />

        <p className="mt-4 text-xs text-neutral-600 font-bold font-mono text-center">
          İpucu: Daire şeklindeki mavi makaslara tıklayarak trenin yönünü anlık olarak değiştirebilirsiniz.
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
          category="Mantık"
          onPlayAgain={() => {
            isGameOverRef.current = false;
            scoreRef.current = 0;
            levelRef.current = 1;
            comboRef.current = 0;
            totalTrainsRef.current = 0;
            successfulTrainsRef.current = 0;
            reactionTimesRef.current = [];
            trainsRef.current = [];
            nextTrainSpawnRef.current = Date.now() + 1000;
            setFinalMetrics(null);
            setIsGameOver(false);
            setIsPaused(false);
            isPausedRef.current = false;
            setLevel(1);
            setScore(0);
            setCombo(0);
            const initialTime = difficultyRef.current === 'EASY' ? 60 : difficultyRef.current === 'HARD' ? 35 : 45;
            setTimeLeft(initialTime);
            setTotalTrains(0);
            setSuccessfulTrains(0);
            setReactionTimes([]);
          }}
          onExit={onExit}
          isWorkoutStep={isWorkoutStep}
          onNextWorkoutStep={onNextWorkoutStep}
        />
      )}
    </div>
  );
};
