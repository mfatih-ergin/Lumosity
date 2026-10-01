import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { Award, RotateCcw, ArrowRight, Zap, Target, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { sounds } from '../../services/soundEffects';

interface GameOverModalProps {
  score: number;
  accuracy: number;
  avgReactionMs: number;
  maxLevel: number;
  bpiEarned: number;
  bpiDelta?: number;
  category: string;
  onPlayAgain: () => void;
  onExit: () => void;
  isWorkoutStep?: boolean;
  onNextWorkoutStep?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  accuracy,
  avgReactionMs,
  maxLevel,
  bpiEarned,
  bpiDelta = 0,
  category,
  onPlayAgain,
  onExit,
  isWorkoutStep = false,
  onNextWorkoutStep,
}) => {
  const normalizedAccuracy = accuracy > 1 ? accuracy / 100 : accuracy;
  const isVictory = normalizedAccuracy >= 0.65;

  useEffect(() => {
    if (isVictory) {
      sounds.playVictory();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ff6b6b', '#fde047', '#4ecdc4', '#a78bfa', '#000000'],
      });
    } else {
      sounds.playDefeat();
    }
  }, [isVictory]);

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-black">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border-[3px] border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#000] text-center overflow-hidden">
        
        {/* Top Trophy / Shield Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ffd43b] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-4">
          <Award className="w-8 h-8 text-black stroke-[2.5]" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
          {isVictory ? '🎉 Muhteşem Zafer!' : '💪 Antrenman Tamamlandı!'}
        </h2>
        <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1 mb-6">
          {isVictory
            ? 'Bilişsel performansınız yüksek doğrulukla NeuroIndex\'e başarıyla işlendi.'
            : 'Yüksek odaklanma için tekrar antrenman yapabilir, reflekslerini keskinleştirebilirsin.'}
        </p>

        {/* Primary Score Highlight */}
        <div className="p-4 rounded-2xl bg-[#fde047] border-2 border-black mb-6 shadow-[3px_3px_0px_0px_#000]">
          <div className="text-xs text-neutral-800 uppercase font-mono font-black tracking-wider mb-1">Kazanılan Puan</div>
          <div className="text-4xl font-black text-black font-mono">
            {score.toLocaleString()}
          </div>
          
          {/* BPI Delta Badge */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border-2 border-black text-black text-xs font-black font-mono shadow-[1.5px_1.5px_0px_0px_#000]">
            <Zap className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            <span>Seans BPI Gücü: {bpiEarned}</span>
            {bpiDelta !== 0 && (
              <span className="text-black font-black">
                ({bpiDelta > 0 ? `+${bpiDelta}` : bpiDelta} BPI)
              </span>
            )}
          </div>
        </div>

        {/* Detailed Neuro Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          {/* Accuracy */}
          <div className="p-3 rounded-xl border-2 border-black bg-[#4ecdc4] shadow-[2px_2px_0px_0px_#000]">
            <div className="flex items-center justify-center gap-1 text-black mb-1">
              <Target className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[10px] uppercase font-mono font-black">Doğruluk</span>
            </div>
            <div className="text-base sm:text-lg font-black text-black font-mono">
              {Math.round(normalizedAccuracy * 100)}%
            </div>
          </div>

          {/* Reaction Speed */}
          <div className="p-3 rounded-xl border-2 border-black bg-[#a78bfa] shadow-[2px_2px_0px_0px_#000]">
            <div className="flex items-center justify-center gap-1 text-black mb-1">
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[10px] uppercase font-mono font-black">Hız</span>
            </div>
            <div className="text-base sm:text-lg font-black text-black font-mono">
              {Math.round(avgReactionMs)}ms
            </div>
          </div>

          {/* Max Level */}
          <div className="p-3 rounded-xl border-2 border-black bg-[#ffbe76] shadow-[2px_2px_0px_0px_#000]">
            <div className="flex items-center justify-center gap-1 text-black mb-1">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[10px] uppercase font-mono font-black">Zirve</span>
            </div>
            <div className="text-base sm:text-lg font-black text-black font-mono">
              Sv. {maxLevel}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isWorkoutStep && onNextWorkoutStep ? (
            <button
              onClick={() => {
                sounds.playClick();
                onNextWorkoutStep();
              }}
              className="flex-1 py-3.5 rounded-xl border-2 border-black bg-[#4ecdc4] hover:bg-[#38d9a9] text-black font-black text-sm shadow-[3.5px_3.5px_0px_0px_#000] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
              <span>Sıradaki Antrenmana Geç</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onPlayAgain();
              }}
              className="flex-1 py-3.5 rounded-xl border-2 border-black bg-[#ff6b6b] hover:bg-[#fa5252] text-black font-black text-sm shadow-[3.5px_3.5px_0px_0px_#000] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Tekrar Oyna</span>
            </button>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onExit();
            }}
            className="px-6 py-3.5 rounded-xl border-2 border-black bg-white hover:bg-[#fff9ea] text-black font-black text-sm shadow-[2.5px_2.5px_0px_0px_#000] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ana Menüye Dön</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
