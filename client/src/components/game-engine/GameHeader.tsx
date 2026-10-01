import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Flame, 
  Timer, 
  Award, 
  AlertTriangle, 
  LogOut, 
  Play
} from 'lucide-react';
import { sounds } from '../../services/soundEffects';

export interface GameHeaderProps {
  title: string;
  category?: string;
  score: number;
  combo: number;
  timeLeft?: number;
  level?: number;
  badgeText?: string;
  centerContent?: React.ReactNode;
  onExit: () => void;
  onPauseToggle?: (isPaused: boolean) => void;
  themeColor?: 'cyan' | 'pink' | 'emerald' | 'amber' | 'purple';
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  category,
  score,
  combo,
  timeLeft,
  level,
  badgeText,
  centerContent,
  onExit,
  onPauseToggle,
}) => {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleOpenExitConfirm = () => {
    sounds.playClick();
    setShowExitConfirm(true);
    onPauseToggle?.(true);
  };

  const handleCancelExit = () => {
    sounds.playClick();
    setShowExitConfirm(false);
    onPauseToggle?.(false);
  };

  const handleConfirmExit = () => {
    sounds.playClick();
    setShowExitConfirm(false);
    onPauseToggle?.(false);
    onExit();
  };

  // Close exit confirm on Escape key
  useEffect(() => {
    if (!showExitConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExitConfirm]);

  // Clean title: remove any mode suffixes like (Kolay), (Orta), (Zor), etc.
  const cleanTitle = (title || '')
    .replace(/\s*\((Kolay|Orta|Zor|Easy|Medium|Hard)\)\s*/gi, '')
    .trim();

  // Show only level (e.g. "Seviye 1") next to game name, or badgeText if provided
  const displayBadge = level !== undefined ? `Seviye ${level}` : badgeText || null;

  return (
    <>
      <div className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] my-4 sm:my-6 select-none text-black">
        {/* Left: Exit button & Game Title + Level */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenExitConfirm}
            className="p-2 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea] text-black transition-all cursor-pointer"
            title="Oyundan Çık"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-black tracking-tight">
              {cleanTitle}
            </h2>
            {displayBadge && (
              <span className="neo-badge bg-[#ffd43b] text-[10px] py-0.5 px-2 text-black font-mono font-black border border-black shadow-[1px_1px_0px_0px_#000]">
                {displayBadge}
              </span>
            )}
          </div>
        </div>

        {/* Center: Custom Content OR Timer Bar */}
        {centerContent ? (
          centerContent
        ) : timeLeft !== undefined ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-black bg-[#fffdf5] shadow-[2px_2px_0px_0px_#000]">
            <Timer className={`w-4 h-4 stroke-[2.5] ${timeLeft <= 10 ? 'text-red-500 animate-spin' : 'text-black'}`} />
            <span className={`font-mono text-sm sm:text-base font-black ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-black'}`}>
              {timeLeft}s
            </span>
          </div>
        ) : null}

        {/* Right: Score and Combo */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Combo */}
          {combo > 1 && (
            <div className="neo-badge bg-[#ff6b6b] text-black font-black text-xs animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-black text-black stroke-[2.5]" />
              <span>x{combo}</span>
            </div>
          )}

          {/* Score */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black bg-[#ffd43b] shadow-[2px_2px_0px_0px_#000]">
            <Award className="w-4 h-4 text-black stroke-[2.5]" />
            <span className="text-xs text-neutral-800 font-mono font-bold">Puan:</span>
            <span className="font-mono text-sm sm:text-base font-black text-black">
              {score.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none text-black">
          <div className="relative w-full max-w-md rounded-3xl bg-white border-[3px] border-black p-6 sm:p-8 shadow-[8px_8px_0px_0px_#000] text-center">
            
            {/* Warning Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ffd43b] border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-4">
              <AlertTriangle className="w-8 h-8 text-black stroke-[2.5]" />
            </div>

            <h3 className="text-2xl font-black text-black tracking-tight">
              Oyundan Çıkmak İstiyor Musunuz?
            </h3>
            
            <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-2 mb-6 leading-relaxed">
              Mevcut seansınız sonlandırılacak ve tamamlanmamış oyun ilerlemeniz kaydedilmeyecektir.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCancelExit}
                className="flex-1 py-3 rounded-xl border-2 border-black bg-[#4ecdc4] hover:bg-[#38d9a9] text-black font-black text-xs shadow-[3px_3px_0px_0px_#000] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Play className="w-4 h-4 fill-black text-black" />
                <span>Oyuna Devam Et</span>
              </button>

              <button
                onClick={handleConfirmExit}
                className="py-3 px-5 rounded-xl border-2 border-black bg-[#ff6b6b] hover:bg-[#fa5252] text-black font-black text-xs shadow-[3px_3px_0px_0px_#000] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4 stroke-[2.5]" />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
