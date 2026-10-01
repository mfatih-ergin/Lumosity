import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Gamepad2, 
  Grid, 
  Navigation, 
  Zap, 
  Target, 
  Play, 
  Info, 
  Sparkles, 
  Search, 
  Brain,
  FileText,
  Calculator,
  Layers,
  Scale,
  BookOpen,
  Eye,
  Shuffle,
  CheckCircle,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { gamesApi } from '../services/api';
import { Game } from '../types';
import { sounds } from '../services/soundEffects';
import { ALL_GAMES_METADATA } from '../constants/gamesData';

interface GamesCatalogProps {
  onPlayGame: (gameId: string) => void;
  initialCategory?: string;
}

export const GamesCatalog: React.FC<GamesCatalogProps> = ({ onPlayGame, initialCategory }) => {
  const [games, setGames] = useState<Game[]>(ALL_GAMES_METADATA);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameInstructions, setSelectedGameInstructions] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const data = await gamesApi.getAll();
        if (data && data.length > 0) {
          const existingIds = new Set(data.map((g) => g.id));
          const missing = ALL_GAMES_METADATA.filter((g) => !existingIds.has(g.id));
          const combined = [...data, ...missing].map((g) => {
            const meta = ALL_GAMES_METADATA.find((m) => m.id === g.id);
            return meta ? { ...g, title: meta.title } : g;
          });
          setGames(combined);
        } else {
          setGames(ALL_GAMES_METADATA);
        }
      } catch (err) {
        console.error('Error fetching games, using catalog fallback:', err);
        setGames(ALL_GAMES_METADATA);
      }
    };
    fetchGames();
  }, []);

  const categories = [
    { id: 'ALL', label: 'Tüm Oyunlar', icon: Gamepad2 },
    { id: 'MEMORY', label: 'Hafıza', icon: Grid },
    { id: 'ATTENTION', label: 'Dikkat & Odak', icon: Navigation },
    { id: 'SPEED', label: 'İşlem Hızı', icon: Zap },
    { id: 'FLEXIBILITY', label: 'Esneklik', icon: Sparkles },
    { id: 'LOGIC', label: 'Mantık & Rota', icon: Target },
    { id: 'LANGUAGE', label: 'Dil', icon: BookOpen },
  ];

  const filteredGames = games.filter((game) => {
    const matchesCategory = selectedCategory === 'ALL' || game.category.toUpperCase() === selectedCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryStyles = (category: string) => {
    switch (category.toUpperCase()) {
      case 'MEMORY': return { bg: 'bg-[#4ecdc4]', badge: 'bg-[#4ecdc4]' };
      case 'ATTENTION': return { bg: 'bg-[#a78bfa]', badge: 'bg-[#a78bfa]' };
      case 'SPEED': return { bg: 'bg-[#ff6b6b]', badge: 'bg-[#ff6b6b]' };
      case 'FLEXIBILITY': return { bg: 'bg-[#ffbe76]', badge: 'bg-[#ffbe76]' };
      case 'LOGIC': return { bg: 'bg-[#fde047]', badge: 'bg-[#fde047]' };
      case 'LANGUAGE': return { bg: 'bg-[#51cf66]', badge: 'bg-[#51cf66]' };
      default: return { bg: 'bg-[#ffbe76]', badge: 'bg-[#ffbe76]' };
    }
  };

  const getGameIcon = (id: string) => {
    switch (id) {
      case 'spatial-matrix':
      case 'matrix-reasoning': return Grid;
      case 'digit-flash': return FileText;
      case 'lost-in-flight':
      case 'penguin-pursuit': return Navigation;
      case 'stroop-rush':
      case 'speed-match':
      case 'spatial-speed': return Zap;
      case 'rail-master':
      case 'pet-detective':
      case 'pinball-recall': return Target;
      case 'flash-math': return Calculator;
      case 'cup-stack':
      case 'memory-match':
      case 'disillusion': return Layers;
      case 'number-compare': return Scale;
      case 'star-search': return Sparkles;
      case 'eagle-eye': return Eye;
      case 'color-match': return CheckCircle;
      case 'rule-switch':
      case 'shape-shift': return Shuffle;
      case 'word-bubbles':
      case 'vocabulary-voyage':
      case 'syllable-rush': return BookOpen;
      default: return Brain;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-black">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="neo-badge bg-[#fde047] text-black mb-2">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>MODÜLER BEYİN GELİŞTİRME EGZERSİZLERİ (24 OYUN)</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight">
            Oyun Kütüphanesi
          </h1>
          <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1">
            Hedeflediğiniz bilişsel alana uygun oyunu seçin ve <span className="text-black font-black underline">Kolay, Orta veya Zor</span> seviyede antrenmana başlayın.
          </p>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-80">
          <Search className="search-icon-fixed w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5] z-10 pointer-events-none" />
          <input
            type="text"
            placeholder="Oyun veya bilişsel alan ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-fixed w-full pl-10 pr-4 py-2.5 rounded-xl border-2 shadow-[3px_3px_0px_0px_#000] text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#fde047]"
          />
        </div>
      </div>

      {/* Category Filter Tabs (Neo Segmented Tab System) */}
      <div className="flex flex-wrap items-center gap-2.5 pb-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'ALL' 
            ? games.length 
            : games.filter((g) => g.category.toUpperCase() === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => {
                sounds.playClick();
                setSelectedCategory(cat.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border-2 border-black ${
                isSelected
                  ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                  : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea] hover:-translate-x-[1px] hover:-translate-y-[1px]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{cat.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10 text-black font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Games Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="neo-card p-6 flex flex-col justify-between min-h-[300px]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 skeleton-shimmer" />
                  <div className="h-6 w-20 rounded-full bg-amber-100 skeleton-shimmer" />
                </div>
                <div className="h-6 w-3/4 rounded-lg bg-amber-100 skeleton-shimmer mb-3" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-amber-100 skeleton-shimmer" />
                  <div className="h-3 w-5/6 rounded bg-amber-100 skeleton-shimmer" />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <div className="flex-1 h-10 rounded-xl bg-amber-100 skeleton-shimmer" />
                <div className="w-10 h-10 rounded-xl bg-amber-100 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-16 neo-card">
          <Gamepad2 className="w-12 h-12 text-black mx-auto mb-3 stroke-[2]" />
          <h3 className="text-lg font-black text-black">
            Aradığınız kriterde oyun bulunamadı
          </h3>
          <p className="text-xs font-bold text-neutral-600 mt-1">
            Arama terimini veya seçtiğiniz kategoriyi değiştirmeyi deneyin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredGames.map((game) => {
            const Icon = getGameIcon(game.id);
            const style = getCategoryStyles(game.category);

            return (
              <div
                key={game.id}
                className="neo-card p-6 flex flex-col justify-between group hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all bg-white"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-center text-black group-hover:scale-105 group-hover:rotate-[-3deg] transition-transform ${style.bg}`}>
                      <Icon className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-black border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ${style.badge}`}>
                      {game.category}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-black">
                    {game.title}
                  </h3>
                  <p className="text-xs font-bold text-neutral-600 mt-2 line-clamp-3 leading-relaxed">
                    {game.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={() => {
                      sounds.playClick();
                      onPlayGame(game.id);
                    }}
                    className="flex-1 py-2.5 rounded-xl border-2 border-black bg-[#ff6b6b] hover:bg-[#fa5252] text-black font-black text-xs shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Hemen Oyna</span>
                  </button>

                  {game.instructions && (
                    <button
                      onClick={() => {
                        sounds.playClick();
                        setSelectedGameInstructions(game);
                      }}
                      title="Nasıl Oynanır?"
                      className="p-2.5 rounded-xl border-2 border-black bg-white hover:bg-amber-50 text-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] transition-all"
                    >
                      <Info className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions Modal (Neo-Brutalism Modal Window Portaled to Body) */}
      {selectedGameInstructions && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedGameInstructions(null);
            }
          }}
          className="fixed inset-0 w-screen h-screen min-h-screen z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1e1e1e] border-[3px] border-black dark:border-[#404040] p-6 sm:p-8 shadow-[8px_8px_0px_0px_#000] text-left text-black dark:text-white">
            <h3 className="text-2xl font-black text-black dark:text-white mb-2 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#ffd43b] border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center">
                <Brain className="w-5 h-5 text-black stroke-[2.5]" />
              </div>
              <span>{selectedGameInstructions.title}</span>
            </h3>

            <div className="my-4 p-4 rounded-2xl bg-[#fffdf5] dark:bg-[#262626] border-2 border-black dark:border-[#404040] text-xs font-bold text-neutral-800 dark:text-neutral-200 whitespace-pre-line leading-relaxed shadow-[2px_2px_0px_0px_#000]">
              {selectedGameInstructions.instructions}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  sounds.playClick();
                  const id = selectedGameInstructions.id;
                  setSelectedGameInstructions(null);
                  onPlayGame(id);
                }}
                className="flex-1 py-3 rounded-xl bg-[#ff6b6b] hover:bg-[#fa5252] border-2 border-black text-black font-black text-xs shadow-[3px_3px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Oyuna Başla</span>
              </button>

              <button
                onClick={() => setSelectedGameInstructions(null)}
                className="px-5 py-3 rounded-xl border-2 border-black dark:border-[#404040] bg-white dark:bg-[#262626] hover:bg-amber-50 dark:hover:bg-[#333333] text-black dark:text-white font-black text-xs shadow-[2px_2px_0px_0px_#000] transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
