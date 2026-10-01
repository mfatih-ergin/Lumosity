import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Flame, 
  Play, 
  ArrowLeft, 
  Sparkles, 
  HelpCircle,
  LucideIcon
} from 'lucide-react';
import { sounds } from '../../services/soundEffects';

export type DifficultyMode = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultyFeatureItem {
  text: string;
  strong?: string;
  highlight?: boolean;
}

export interface DifficultyCardConfig {
  title?: string;
  description: string;
  multiplierBadge?: string;
  badgeExtra?: string;
  icon?: LucideIcon;
  features: Array<string | DifficultyFeatureItem>;
  buttonText?: string;
}

export interface DifficultySelectionScreenProps {
  gameTitle: string;
  category: string;
  description?: string;
  onSelectDifficulty: (mode: DifficultyMode) => void;
  onExit: () => void;
  options: {
    EASY: DifficultyCardConfig;
    MEDIUM: DifficultyCardConfig;
    HARD: DifficultyCardConfig;
  };
  infoNote?: string | React.ReactNode;
}

export const DifficultySelectionScreen: React.FC<DifficultySelectionScreenProps> = ({
  gameTitle,
  category,
  description = 'Zihinsel performansınızı ve hızınızı test etmek için uygun bir seviye seçin.',
  onSelectDifficulty,
  onExit,
  options,
  infoNote,
}) => {
  const handleSelect = (mode: DifficultyMode) => {
    sounds.playClick();
    onSelectDifficulty(mode);
  };

  const handleBack = () => {
    sounds.playClick();
    onExit();
  };

  const renderFeatureItem = (item: string | DifficultyFeatureItem) => {
    if (typeof item === 'string') {
      return (
        <li className="flex items-start gap-2 text-neutral-800 font-bold">
          <span className="w-2 h-2 rounded-full bg-black mt-1.5 shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      );
    }

    return (
      <li className="flex items-start gap-2 text-neutral-800 font-bold">
        <span className="w-2 h-2 rounded-full bg-black mt-1.5 shrink-0" />
        <span>
          {item.strong && <strong className="text-black mr-1">{item.strong}</strong>}
          <span className={item.highlight ? 'text-black underline font-black' : ''}>
            {item.text}
          </span>
        </span>
      </li>
    );
  };

  const easyConfig = options.EASY;
  const mediumConfig = options.MEDIUM;
  const hardConfig = options.HARD;

  const EasyIcon = easyConfig.icon || ShieldCheck;
  const MediumIcon = mediumConfig.icon || Zap;
  const HardIcon = hardConfig.icon || Flame;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in select-none text-black">
      
      {/* Top Navigation & Category Badge */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="neo-btn bg-white text-black px-4 py-2 text-xs shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea]"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Kütüphaneye Dön</span>
        </button>

        <div className="neo-badge bg-[#ffd43b] text-black">
          <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{category.toUpperCase()}</span>
        </div>
      </div>

      {/* Hero Title */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
          {gameTitle}
        </h1>
        <p className="text-sm sm:text-base font-bold text-neutral-700 leading-relaxed">
          {description}
        </p>
      </div>

      {/* 3 Difficulty Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* EASY MODE */}
        <div 
          onClick={() => handleSelect('EASY')}
          className="neo-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between group hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#4ecdc4] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-center text-black group-hover:scale-105 transition-transform">
                <EasyIcon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <span className="neo-badge bg-[#4ecdc4] text-black">
                {easyConfig.multiplierBadge || '1.0x Puan'}
              </span>
            </div>

            <h3 className="text-2xl font-black text-black">
              {easyConfig.title || 'Kolay Mod'}
            </h3>
            <p className="text-xs font-bold text-neutral-600 mt-1 mb-5">
              {easyConfig.description}
            </p>

            <ul className="space-y-2.5 text-xs">
              {easyConfig.features.map((feature, idx) => (
                <React.Fragment key={idx}>
                  {renderFeatureItem(feature)}
                </React.Fragment>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleSelect('EASY')}
            className="mt-8 neo-btn bg-[#4ecdc4] hover:bg-[#38d9a9] text-black w-full py-3 text-xs shadow-[3px_3px_0px_0px_#000]"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>{easyConfig.buttonText || 'Kolay Modda Başla'}</span>
          </button>
        </div>

        {/* MEDIUM MODE (RECOMMENDED) */}
        <div 
          onClick={() => handleSelect('MEDIUM')}
          className="neo-card p-6 sm:p-7 cursor-pointer bg-[#fffdf5] flex flex-col justify-between group relative overflow-hidden hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all"
        >
          <div className="absolute top-0 right-0 bg-[#ffd43b] border-b-2 border-l-2 border-black text-black font-black text-[9px] uppercase px-3 py-1 rounded-bl-xl tracking-wider shadow-[1px_1px_0px_0px_#000]">
            {mediumConfig.badgeExtra || 'ÖNERİLEN'}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ffd43b] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-center text-black group-hover:scale-105 transition-transform">
                <MediumIcon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <span className="neo-badge bg-[#ffd43b] text-black">
                {mediumConfig.multiplierBadge || '1.25x Puan'}
              </span>
            </div>

            <h3 className="text-2xl font-black text-black">
              {mediumConfig.title || 'Orta Mod (Klasik)'}
            </h3>
            <p className="text-xs font-bold text-neutral-600 mt-1 mb-5">
              {mediumConfig.description}
            </p>

            <ul className="space-y-2.5 text-xs">
              {mediumConfig.features.map((feature, idx) => (
                <React.Fragment key={idx}>
                  {renderFeatureItem(feature)}
                </React.Fragment>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleSelect('MEDIUM')}
            className="mt-8 neo-btn bg-[#ffd43b] hover:bg-amber-300 text-black w-full py-3 text-xs shadow-[3px_3px_0px_0px_#000]"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>{mediumConfig.buttonText || 'Orta Modda Başla'}</span>
          </button>
        </div>

        {/* HARD MODE */}
        <div 
          onClick={() => handleSelect('HARD')}
          className="neo-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between group hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ff6b6b] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-center text-black group-hover:scale-105 transition-transform">
                <HardIcon className="w-7 h-7 stroke-[2.5]" />
              </div>
              <span className="neo-badge bg-[#ff6b6b] text-black">
                {hardConfig.multiplierBadge || '1.6x Puan'}
              </span>
            </div>

            <h3 className="text-2xl font-black text-black">
              {hardConfig.title || 'Zor Mod'}
            </h3>
            <p className="text-xs font-bold text-neutral-600 mt-1 mb-5">
              {hardConfig.description}
            </p>

            <ul className="space-y-2.5 text-xs">
              {hardConfig.features.map((feature, idx) => (
                <React.Fragment key={idx}>
                  {renderFeatureItem(feature)}
                </React.Fragment>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleSelect('HARD')}
            className="mt-8 neo-btn bg-[#ff6b6b] hover:bg-[#fa5252] text-black w-full py-3 text-xs shadow-[3px_3px_0px_0px_#000]"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>{hardConfig.buttonText || 'Zor Modda Başla'}</span>
          </button>
        </div>

      </div>

      {/* Explanatory Info Card */}
      {infoNote && (
        <div className="neo-card p-5 flex items-start gap-4 shadow-[3px_3px_0px_0px_#000]">
          <div className="p-2 rounded-xl bg-[#ffd43b] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] shrink-0">
            <HelpCircle className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div className="text-xs font-bold text-neutral-800 leading-relaxed">
            {typeof infoNote === 'string' ? (
              <span dangerouslySetInnerHTML={{ __html: infoNote }} />
            ) : (
              infoNote
            )}
          </div>
        </div>
      )}

    </div>
  );
};
