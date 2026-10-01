import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Flame, 
  Play, 
  Calendar, 
  ArrowRight, 
  Zap, 
  TrendingUp, 
  Target, 
  Sparkles,
  Grid,
  Navigation,
  Activity,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { gamesApi, workoutApi } from '../services/api';
import { Game, DailyWorkout } from '../types';
import { sounds } from '../services/soundEffects';

interface DashboardProps {
  onNavigate: (tab: string, categoryId?: string) => void;
  onPlayGame: (gameId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onPlayGame }) => {
  const { user, setAuthModalOpen } = useAuthStore();
  const [games, setGames] = useState<Game[]>([]);
  const [workout, setWorkout] = useState<DailyWorkout | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [gamesRes, leaderboardRes] = await Promise.all([
          gamesApi.getAll(),
          gamesApi.getLeaderboard(),
        ]);
        setGames(gamesRes);
        setLeaderboard(leaderboardRes.leaderboard || []);

        if (user) {
          try {
            const workoutRes = await workoutApi.getDaily();
            setWorkout(workoutRes);
          } catch (e) {
            console.error('Workout fetch error:', e);
          }
        }
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const completedWorkoutCount = workout?.games?.filter((g) => g.completed)?.length || 0;
  const totalWorkoutCount = workout?.games?.length || 3;

  const categoryCards = [
    { title: 'Hafıza', key: 'MEMORY', value: user?.memoryBpi || 500, color: 'bg-[#4ecdc4]', icon: Grid, description: 'Görsel ve mekansal hafıza' },
    { title: 'Dikkat', key: 'ATTENTION', value: user?.attentionBpi || 500, color: 'bg-[#a78bfa]', icon: Navigation, description: 'Odaklanma ve seletif dikkat' },
    { title: 'İşlem Hızı', key: 'SPEED', value: user?.speedBpi || 500, color: 'bg-[#ff6b6b]', icon: Zap, description: 'Tepki süresi ve reaksiyon' },
    { title: 'Esneklik', key: 'FLEXIBILITY', value: user?.flexBpi || 500, color: 'bg-[#ffbe76]', icon: Sparkles, description: 'Zihinsel esneklik & adaptasyon' },
    { title: 'Mantık', key: 'LOGIC', value: user?.logicBpi || 500, color: 'bg-[#fde047]', icon: Target, description: 'Problem çözme & rota planlama' },
    { title: 'Dil', key: 'LANGUAGE', value: null, color: 'bg-[#51cf66]', icon: BookOpen, description: 'Kelime & sözel akıcılık (Yakında)' },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-black">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#fde047] border-[2.5px] border-black p-6 sm:p-10 shadow-[6px_6px_0px_0px_#000000]">
        
        {/* Floating Geometric Decorations (Neo-Brutalism signature) */}
        <div className="absolute top-4 right-8 w-6 h-6 rounded-md bg-[#ff6b6b] border-2 border-black rotate-12 shadow-[2px_2px_0px_0px_#000] hidden sm:block pointer-events-none" />
        <div className="absolute bottom-6 right-24 w-8 h-8 rounded-full bg-[#4ecdc4] border-2 border-black shadow-[2px_2px_0px_0px_#000] hidden sm:block pointer-events-none" />
        <div className="absolute top-1/2 right-4 w-5 h-5 bg-[#a78bfa] border-2 border-black rotate-45 shadow-[2px_2px_0px_0px_#000] hidden md:block pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border-2 border-black text-black text-xs font-black shadow-[2px_2px_0px_0px_#000]">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>GÜNLÜK BİLİŞSEL GELİŞİM AKIŞI</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tight leading-tight">
              {user ? `Hoş Geldin, ${user.username}!` : 'Zihninin Sınırlarını Keşfetmeye Hazır Mısın?'}
            </h1>
            <p className="text-sm sm:text-base font-bold text-neutral-800 leading-relaxed">
              Günde sadece 10 dakikalık adaptif egzersizler ile reaksiyon hızını, odaklanma gücünü ve hafıza kapasiteni zirveye taşı.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                sounds.playClick();
                if (!user) {
                  setAuthModalOpen(true, 'register');
                } else {
                  onNavigate('workout');
                }
              }}
              className="neo-btn bg-[#ff6b6b] text-black px-6 py-3.5 shadow-[4px_4px_0px_0px_#000] text-sm hover:bg-[#fa5252]"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Antrenmana Başla</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onNavigate('games');
              }}
              className="neo-btn bg-[#4ecdc4] text-black px-5 py-3.5 shadow-[4px_4px_0px_0px_#000] text-sm hover:bg-[#3dbdb4]"
            >
              <Brain className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Oyun Kütüphanesi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Daily Workout Card */}
        <div 
          onClick={() => {
            sounds.playClick();
            onNavigate('workout');
          }}
          className="neo-card p-6 cursor-pointer flex flex-col justify-between group hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffd43b] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-center text-black group-hover:rotate-6 transition-transform">
                <Calendar className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="neo-badge bg-[#ffd43b] text-black">
                {completedWorkoutCount}/{totalWorkoutCount} Tamamlandı
              </span>
            </div>
            <h3 className="text-xl font-black text-black">
              Günün Beyin Rutini
            </h3>
            <p className="text-xs font-bold text-neutral-600 mt-1">
              Hafıza, dikkat ve hız alanlarında 3 aşamalı kişiselleştirilmiş antrenman.
            </p>
          </div>

          <div className="mt-6">
            <div className="w-full h-4 rounded-full border-2 border-black bg-white overflow-hidden p-0.5 shadow-[2px_2px_0px_0px_#000] mb-3">
              <div
                className="h-full rounded-full bg-[#ff6b6b] border-r-2 border-black transition-all duration-500"
                style={{ width: `${(completedWorkoutCount / totalWorkoutCount) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-black text-black">
              <span>Rutine Devam Et</span>
              <div className="p-1.5 rounded-lg border-2 border-black bg-[#ffd43b] shadow-[1.5px_1.5px_0px_0px_#000]">
                <ArrowRight className="w-3.5 h-3.5 text-black stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        {/* Cognitive Index (BPI) Card */}
        <div 
          onClick={() => {
            sounds.playClick();
            onNavigate('analytics');
          }}
          className="neo-card p-6 cursor-pointer flex flex-col justify-between group hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#4ecdc4] border-2 border-black shadow-[2.5px_2.5px_0px_0px_#000] flex items-center justify-center text-black group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="neo-badge bg-[#ffbe76] text-black">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-black" />
                <span>{user?.streakDays || 0} Gün Seri</span>
              </div>
            </div>
            <h3 className="text-xl font-black text-black">
              Bilişsel NeuroIndex (BPI)
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-black font-mono">
                {user?.overallBpi || 500}
              </span>
              <span className="text-xs font-bold text-neutral-600">/ 1500 Maksimum Puan</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-black text-black">
            <span>Detaylı Analizi İncele</span>
            <div className="p-1.5 rounded-lg border-2 border-black bg-[#4ecdc4] shadow-[1.5px_1.5px_0px_0px_#000]">
              <ArrowRight className="w-3.5 h-3.5 text-black stroke-[3]" />
            </div>
          </div>
        </div>

      </div>

      {/* Cognitive Domains Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-black stroke-[2.5]" />
            <span>Bilişsel Alanlar ve Becerilerini Geliştir</span>
          </h2>
          <button
            onClick={() => {
              sounds.playClick();
              onNavigate('games');
            }}
            className="neo-btn bg-white text-black px-3.5 py-1.5 text-xs shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea]"
          >
            <span>Tüm Oyunları Gör</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryCards.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.key}
                onClick={() => {
                  sounds.playClick();
                  onNavigate('games', cat.key);
                }}
                className="neo-card p-5 flex flex-col justify-between cursor-pointer hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#000] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] ${cat.color} text-black group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    {cat.value !== null ? (
                      <span className="font-mono text-sm font-black text-black bg-white px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
                        {cat.value} <span className="text-[10px] text-neutral-600 font-bold">BPI</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black font-mono bg-[#fde047] text-black px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_0px_#000]">
                        Yakında
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-black text-base">{cat.title}</h4>
                  <p className="text-xs font-bold text-neutral-600 mt-1">{cat.description}</p>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-black/10">
                  <span className="text-xs font-black text-black group-hover:underline">Egzersizleri Aç</span>
                  <div className="p-1 rounded-lg border border-black bg-[#fde047] shadow-[1px_1px_0px_0px_#000]">
                    <ArrowRight className="w-3.5 h-3.5 text-black stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard & Community Section */}
      <div className="neo-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 border-b-2 border-black pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ffd43b] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <TrendingUp className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-black">Genel BPI Liderlik Tablosu</h3>
          </div>
          <span className="neo-badge bg-[#a78bfa] text-black">
            En Yüksek Skorlar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-200 skeleton-shimmer" />
                  <div className="w-8 h-8 rounded-full bg-slate-200 skeleton-shimmer border border-black" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-20 rounded bg-slate-200 skeleton-shimmer" />
                    <div className="h-2 w-14 rounded bg-slate-200 skeleton-shimmer" />
                  </div>
                </div>
                <div className="h-4 w-10 rounded bg-slate-200 skeleton-shimmer" />
              </div>
            ))
          ) : leaderboard.length === 0 ? (
            <div className="col-span-full text-center py-6 text-xs text-neutral-600 font-mono font-bold">
              Henüz liderlik sıralaması oluşmadı.
            </div>
          ) : (
            leaderboard.slice(0, 6).map((player, idx) => (
              <div
                key={player.id || idx}
                className="flex items-center justify-between p-3 rounded-xl border-2 border-black bg-[#fffdf7] shadow-[2.5px_2.5px_0px_0px_#000] hover:bg-amber-50 hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black font-mono border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ${
                    idx === 0 ? 'bg-[#ffd43b] text-black' : idx === 1 ? 'bg-slate-200 text-black' : idx === 2 ? 'bg-[#ffbe76] text-black' : 'bg-white text-black'
                  }`}>
                    {idx + 1}
                  </span>
                  <img
                    src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                    alt={player.username}
                    className="w-8 h-8 rounded-full bg-amber-100 border-2 border-black object-cover"
                  />
                  <div>
                    <div className="text-xs font-black text-black">{player.username}</div>
                    <div className="text-[10px] text-neutral-600 font-mono font-bold">{player.streakDays || 0} gün seri</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-black font-mono bg-[#fde047] border border-black px-1.5 py-0.5 rounded shadow-[1px_1px_0px_0px_#000]">
                    {player.overallBpi}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
