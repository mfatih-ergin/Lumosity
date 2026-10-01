import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Brain, 
  Target, 
  Zap, 
  Award, 
  Flame, 
  Save, 
  Volume2, 
  VolumeX, 
  Bell, 
  LogOut, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  Trophy, 
  Plus, 
  Sparkles,
  Grid,
  Navigation,
  Compass,
  Palette,
  Sliders,
  Crown,
  Medal,
  Rocket,
  Star,
  Eye,
  Activity,
  Dumbbell,
  Flag,
  Layers
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { sounds } from '../services/soundEffects';
import { applyThemeToBody } from '../utils/theme';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, updateProfile, updateSettings, toggleStreakFreeze, buyStreakFreeze, logout } = useAuthStore();

  const [username, setUsername] = useState(user?.username || '');
  const [avatarSeed, setAvatarSeed] = useState(user?.username || 'NeuroHero');
  const [primaryGoal, setPrimaryGoal] = useState(user?.profile?.primaryGoal || 'GENERAL');
  const [birthYear, setBirthYear] = useState<number | ''>(
    user?.profile?.birthYear || ''
  );
  const [occupation, setOccupation] = useState(user?.profile?.occupation || user?.profile?.educationLevel || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Audio & Reminder settings state
  const [soundEnabled, setSoundEnabled] = useState(user?.settings?.soundEnabled ?? true);
  const [soundVolume, setSoundVolume] = useState((user?.settings?.soundVolume ?? 0.8) * 100);
  const [dailyReminder, setDailyReminder] = useState(user?.settings?.dailyReminder ?? false);
  const [reminderTime, setReminderTime] = useState(user?.settings?.reminderTime ?? '20:00');
  const [selectedTheme, setSelectedTheme] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('neuro_theme')) || user?.settings?.theme || 'LIGHT_WHITE');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState(false);

  // Profile Tab Bar state (Başarımlar vs Lob Dağılımı & Seri vs Ayarlar)
  const [activeProfileTab, setActiveProfileTab] = useState<'achievements' | 'performance' | 'settings'>('achievements');

  // Achievement filter state
  const [achievementCategory, setAchievementCategory] = useState<string>('ALL');

  const settingsDebounceRef = useRef<any>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setAvatarSeed(user.username);
      setPrimaryGoal(user.profile?.primaryGoal || 'GENERAL');
      setBirthYear(user.profile?.birthYear || '');
      setOccupation(user.profile?.occupation || user.profile?.educationLevel || '');
      setSoundEnabled(user.settings?.soundEnabled ?? true);
      setSoundVolume((user.settings?.soundVolume ?? 0.8) * 100);
      setDailyReminder(user.settings?.dailyReminder ?? false);
      setReminderTime(user.settings?.reminderTime ?? '20:00');
      const savedTheme = localStorage.getItem('neuro_theme');
      const targetTheme = savedTheme || user.settings?.theme || 'LIGHT_WHITE';
      setSelectedTheme(targetTheme);
      applyThemeToBody(targetTheme);
    }
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      sounds.playClick();

      await updateProfile({
        username,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`,
        primaryGoal,
        educationLevel: occupation,
        occupation,
        birthYear: birthYear ? Number(birthYear) : null,
      });

      setProfileSuccessMsg('Profil başarıyla güncellendi!');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Profile update failed:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveSettingsToBackend = async (
    sEnabled: boolean,
    sVol: number,
    dReminder: boolean,
    rTime: string,
    theme?: string
  ) => {
    try {
      await updateSettings({
        soundEnabled: sEnabled,
        soundVolume: sVol / 100,
        dailyReminder: dReminder,
        reminderTime: rTime,
        theme: theme || selectedTheme,
      });
      setSettingsSuccessMsg(true);
      setTimeout(() => setSettingsSuccessMsg(false), 2000);
    } catch (e) {
      console.error('Settings save failed:', e);
    }
  };

  const handleToggleFreeze = () => {
    sounds.playClick();
    toggleStreakFreeze();
  };

  const handleBuyFreeze = () => {
    sounds.playClick();
    buyStreakFreeze();
  };

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    sounds.setMuted(!enabled);
    sounds.playClick();
    saveSettingsToBackend(enabled, soundVolume, dailyReminder, reminderTime);
  };

  const handleVolumeChange = (newVolume: number) => {
    setSoundVolume(newVolume);
    sounds.setVolume(newVolume / 100);

    if (settingsDebounceRef.current) {
      clearTimeout(settingsDebounceRef.current);
    }

    settingsDebounceRef.current = setTimeout(() => {
      sounds.playClick();
      saveSettingsToBackend(soundEnabled, newVolume, dailyReminder, reminderTime);
    }, 350);
  };

  const handleToggleReminder = (enabled: boolean) => {
    setDailyReminder(enabled);
    sounds.playClick();
    saveSettingsToBackend(soundEnabled, soundVolume, enabled, reminderTime);
  };

  const handleReminderTimeChange = (newTime: string) => {
    setReminderTime(newTime);
    if (settingsDebounceRef.current) {
      clearTimeout(settingsDebounceRef.current);
    }
    settingsDebounceRef.current = setTimeout(() => {
      saveSettingsToBackend(soundEnabled, soundVolume, dailyReminder, newTime);
    }, 400);
  };

  const randomizeAvatar = () => {
    const seeds = ['Nova', 'Titan', 'Cosmo', 'Alpha', 'Echo', 'Quantum', 'Nebula', 'Spark', 'Zenith', 'Vortex'];
    const random = seeds[Math.floor(Math.random() * seeds.length)] + '_' + Math.floor(100 + Math.random() * 900);
    setAvatarSeed(random);
    sounds.playClick();
  };

  const handleThemeChange = (newTheme: string) => {
    localStorage.setItem('neuro_theme', newTheme);
    setSelectedTheme(newTheme);
    applyThemeToBody(newTheme);
    sounds.playClick();
    saveSettingsToBackend(soundEnabled, soundVolume, dailyReminder, reminderTime, newTheme);
  };

  const badgesList = [
    {
      id: 'first-step',
      title: 'İlk Adım',
      description: 'Platformda ilk beyin egzersizini başarıyla tamamla',
      icon: Sparkles,
      color: 'bg-[#ffd43b]',
      xp: 50,
      unlocked: (user.streakDays || 0) > 0 || (user._count?.gameSessions || 0) > 0,
    },
    {
      id: 'streak-3',
      title: 'Alışkanlık Başlangıcı',
      description: '3 gün üst üste antrenman serisine ulaş',
      icon: Flame,
      color: 'bg-[#ff6b6b]',
      xp: 100,
      unlocked: (user.streakDays || 0) >= 3,
    },
    {
      id: 'streak-7',
      title: 'Haftalık Şampiyon',
      description: '7 günlük kesintisiz antrenman serisine ulaş',
      icon: Trophy,
      color: 'bg-[#a78bfa]',
      xp: 250,
      unlocked: (user.streakDays || 0) >= 7,
    },
    {
      id: 'streak-14',
      title: 'İki Haftalık Azim',
      description: '14 gün boyunca kesintisiz her gün antrenman yap',
      icon: Medal,
      color: 'bg-[#4ecdc4]',
      xp: 400,
      unlocked: (user.streakDays || 0) >= 14,
    },
    {
      id: 'streak-30',
      title: 'Aylık Efsane',
      description: '30 günlük kesintisiz disiplinli antrenman serisine ulaş',
      icon: Crown,
      color: 'bg-[#fde047]',
      xp: 750,
      unlocked: (user.streakDays || 0) >= 30,
    },
    {
      id: 'bpi-600',
      title: 'Zihin Açılışı',
      description: 'Genel BPI puanını 600 seviyesinin üzerine çıkar',
      icon: Brain,
      color: 'bg-[#4ecdc4]',
      xp: 150,
      unlocked: (user.overallBpi || 0) >= 600,
    },
    {
      id: 'bpi-800',
      title: 'Bilişsel Usta',
      description: 'Genel BPI puanını 800 seviyesinin üzerine çıkar',
      icon: Award,
      color: 'bg-[#fde047]',
      xp: 300,
      unlocked: (user.overallBpi || 0) >= 800,
    },
    {
      id: 'bpi-1000',
      title: 'Dahi Zihin',
      description: 'Genel BPI puanını 1000 seviyesinin üzerine taşı',
      icon: Crown,
      color: 'bg-[#ff6b6b]',
      xp: 600,
      unlocked: (user.overallBpi || 0) >= 1000,
    },
    {
      id: 'speed-demon',
      title: 'Şimşek Refleks',
      description: 'İşlem Hızı BPI puanını 550 üzerine taşı',
      icon: Zap,
      color: 'bg-[#ff6b6b]',
      xp: 150,
      unlocked: (user.speedBpi || 0) >= 550,
    },
    {
      id: 'speed-700',
      title: 'Işık Hızı',
      description: 'İşlem Hızı BPI puanını 700 seviyesine ulaştır',
      icon: Rocket,
      color: 'bg-[#ffbe76]',
      xp: 300,
      unlocked: (user.speedBpi || 0) >= 700,
    },
    {
      id: 'memory-master',
      title: 'Hafıza Dehası',
      description: 'Hafıza BPI puanını 550 üzerine taşı',
      icon: Grid,
      color: 'bg-[#4ecdc4]',
      xp: 150,
      unlocked: (user.memoryBpi || 0) >= 550,
    },
    {
      id: 'memory-700',
      title: 'Fotografik Zihin',
      description: 'Hafıza BPI puanını 700 seviyesine ulaştır',
      icon: Star,
      color: 'bg-[#a78bfa]',
      xp: 300,
      unlocked: (user.memoryBpi || 0) >= 700,
    },
    {
      id: 'logic-king',
      title: 'Mantık Mimarı',
      description: 'Mantık BPI puanını 550 üzerine taşı',
      icon: Target,
      color: 'bg-[#a78bfa]',
      xp: 150,
      unlocked: (user.logicBpi || 0) >= 550,
    },
    {
      id: 'logic-700',
      title: 'Strateji Üstadı',
      description: 'Mantık & Muhakeme BPI puanını 700 seviyesine çıkar',
      icon: Compass,
      color: 'bg-[#4ecdc4]',
      xp: 300,
      unlocked: (user.logicBpi || 0) >= 700,
    },
    {
      id: 'attention-focus',
      title: 'Lazer Odak',
      description: 'Dikkat & Odak BPI puanını 550 üzerine taşı',
      icon: Navigation,
      color: 'bg-[#fde047]',
      xp: 150,
      unlocked: (user.attentionBpi || 0) >= 550,
    },
    {
      id: 'attention-zen',
      title: 'Zen Ustası',
      description: 'Dikkat & Odak BPI puanını 700 seviyesine çıkar',
      icon: Eye,
      color: 'bg-[#51cf66]',
      xp: 300,
      unlocked: (user.attentionBpi || 0) >= 700,
    },
    {
      id: 'flex-thinker',
      title: 'Esnek Düşünür',
      description: 'Bilişsel Esneklik BPI puanını 550 üzerine çıkar',
      icon: Sparkles,
      color: 'bg-[#ffbe76]',
      xp: 150,
      unlocked: (user.flexBpi || 0) >= 550,
    },
    {
      id: 'flex-master',
      title: 'Uyum Cambazı',
      description: 'Bilişsel Esneklik BPI puanını 700 seviyesine ulaştır',
      icon: Activity,
      color: 'bg-[#ff6b6b]',
      xp: 300,
      unlocked: (user.flexBpi || 0) >= 700,
    },
    {
      id: 'streak-guardian',
      title: 'Seri Kalkanı Muhafızı',
      description: 'Seri Kalkanını devrede tutarak serini koruma altına al',
      icon: ShieldCheck,
      color: 'bg-[#4ecdc4]',
      xp: 100,
      unlocked: user.isStreakFrozen !== false || (user.streakFreezeCount || 0) > 0,
    },
    {
      id: 'session-10',
      title: 'Antrenman Müdavimi',
      description: 'Toplam 10 veya daha fazla beyin egzersizi oturumu tamamla',
      icon: Dumbbell,
      color: 'bg-[#ffd43b]',
      xp: 200,
      unlocked: (user._count?.gameSessions || 0) >= 10 || (user.streakDays || 0) >= 5,
    },
    {
      id: 'session-25',
      title: 'Bilişsel Maratoncu',
      description: 'Toplam 25 veya daha fazla antrenman seansını başarıyla bitir',
      icon: Flag,
      color: 'bg-[#a78bfa]',
      xp: 450,
      unlocked: (user._count?.gameSessions || 0) >= 25 || (user.streakDays || 0) >= 15,
    },
    {
      id: 'balanced-mind',
      title: 'Dengeli Zihin',
      description: '5 temel bilişsel alanın hepsinde en az 500 BPI puanına ulaş',
      icon: Layers,
      color: 'bg-[#51cf66]',
      xp: 350,
      unlocked: (user.memoryBpi || 0) >= 500 && (user.attentionBpi || 0) >= 500 && (user.speedBpi || 0) >= 500 && (user.logicBpi || 0) >= 500 && (user.flexBpi || 0) >= 500,
    },
  ];

  const unlockedBadgesCount = badgesList.filter((b) => b.unlocked).length;

  const filteredBadges = badgesList.filter((b) => {
    if (achievementCategory === 'UNLOCKED') return b.unlocked;
    if (achievementCategory === 'LOCKED') return !b.unlocked;
    return true;
  });

  const cognitiveDomains = [
    { title: 'Hafıza (Memory)', key: 'memoryBpi', value: user.memoryBpi, color: 'bg-[#4ecdc4]', icon: Grid },
    { title: 'Dikkat (Attention)', key: 'attentionBpi', value: user.attentionBpi, color: 'bg-[#a78bfa]', icon: Navigation },
    { title: 'İşlem Hızı (Speed)', key: 'speedBpi', value: user.speedBpi, color: 'bg-[#ff6b6b]', icon: Zap },
    { title: 'Mantık & Muhakeme (Logic)', key: 'logicBpi', value: user.logicBpi, color: 'bg-[#fde047]', icon: Target },
    { title: 'Bilişsel Esneklik (Flexibility)', key: 'flexBpi', value: user.flexBpi, color: 'bg-[#ffbe76]', icon: Compass },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-black">
      
      {/* Profile Header Banner (Neo-Brutalism style) */}
      <div className="relative overflow-hidden rounded-3xl bg-[#fde047] border-[2.5px] border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000]">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Avatar & User Info */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`}
                alt={user.username}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] object-cover"
              />
              <button
                type="button"
                onClick={randomizeAvatar}
                title="Rastgele Avatar Oluştur"
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-[#ff6b6b] hover:bg-[#fa5252] border-2 border-black text-black shadow-[2px_2px_0px_0px_#000] transition-transform active:scale-90"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                  {user.username}
                </h1>
              </div>
              <p className="text-xs font-mono font-bold text-neutral-800">{user.email}</p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="neo-badge bg-[#ffbe76] text-black">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 text-black stroke-[2.5]" />
                  <span>{user.streakDays} Gün Seri</span>
                </div>
                {user.isStreakFrozen !== false && (
                  <div className="neo-badge bg-[#4ecdc4] text-black">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>🛡️ {user.streakFreezeCount ?? 1} Kalkan</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Overall BPI Highlight Badge */}
          <div className="w-full md:w-auto p-5 sm:p-6 rounded-2xl bg-white border-2 border-black text-center md:text-right shadow-[4px_4px_0px_0px_#000] flex md:flex-col justify-between items-center md:items-end">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-600 font-black">Genel Bilişsel İndeks</div>
              <div className="text-3xl sm:text-4xl font-black text-black font-mono">
                {user.overallBpi} <span className="text-sm font-bold text-neutral-600">/ 1500 BPI</span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="mt-2 neo-btn bg-[#ff6b6b] text-black text-xs px-3.5 py-1.5 shadow-[2px_2px_0px_0px_#000]"
            >
              <span>Detaylı Analiz</span>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Profile Section Navigation Bar (Başarımlar vs Lob Dağılımı & Kalkan vs Ayarlar) */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#1e1e1e] border-[2.5px] border-black dark:border-[#383838] shadow-[4px_4px_0px_0px_#000] w-full max-w-2xl">
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveProfileTab('achievements');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all border-2 ${
            activeProfileTab === 'achievements'
              ? 'bg-[#fde047] text-black border-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
              : 'border-transparent text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#282828]'
          }`}
        >
          <Trophy className="w-4 h-4 stroke-[2.5]" />
          <span>Başarımlar</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black border transition-colors ${
            activeProfileTab === 'achievements'
              ? 'bg-white text-black border-black shadow-[1px_1px_0px_0px_#000]'
              : 'bg-neutral-100 dark:bg-[#2a2a2a] text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600'
          }`}>
            {unlockedBadgesCount}/{badgesList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveProfileTab('performance');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all border-2 ${
            activeProfileTab === 'performance'
              ? 'bg-[#fde047] text-black border-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
              : 'border-transparent text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#282828]'
          }`}
        >
          <Brain className="w-4 h-4 stroke-[2.5]" />
          <span>Lob Dağılımı & Kalkan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            setActiveProfileTab('settings');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all border-2 ${
            activeProfileTab === 'settings'
              ? 'bg-[#fde047] text-black border-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
              : 'border-transparent text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#282828]'
          }`}
        >
          <Sliders className="w-4 h-4 stroke-[2.5]" />
          <span>Ayarlar</span>
        </button>
      </div>

      {/* Tab 1: Başarımlar Section */}
      {activeProfileTab === 'achievements' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Kazanılan Rozetler & Başarımlar Card */}
          <div className="neo-card p-6 shadow-[5px_5px_0px_0px_#000] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-[#383838] pb-3">
              <h2 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-black dark:text-white stroke-[2.5]" />
                <span>Kazanılan Rozetler & Başarımlar</span>
              </h2>
              <span className="neo-badge bg-[#ffd43b] text-black text-xs font-mono font-black">
                🏆 {unlockedBadgesCount} / {badgesList.length} Kazanıldı
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'ALL', label: `Tüm Rozetler (${badgesList.length})` },
                { id: 'UNLOCKED', label: `Kazanılanlar (${unlockedBadgesCount})` },
                { id: 'LOCKED', label: `Kilitli (${badgesList.length - unlockedBadgesCount})` },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setAchievementCategory(filter.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-black dark:border-[#404040] transition-all ${
                    achievementCategory === filter.id
                      ? 'bg-[#fde047] text-black shadow-[2px_2px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-white dark:bg-[#282828] text-black dark:text-white shadow-[1px_1px_0px_0px_#000] hover:bg-amber-50 dark:hover:bg-[#333333]'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
              {filteredBadges.map((badge) => {
                const Icon = badge.icon;
                const isUnlocked = badge.unlocked;
                const isDarkTheme = selectedTheme === 'DARK' || selectedTheme === 'DARK_BLACK';

                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-2xl transition-all flex items-start gap-3.5 border-2 ${
                      isDarkTheme
                        ? (isUnlocked 
                            ? 'bg-[#282828] border-[#444444] shadow-[3px_3px_0px_0px_#000]' 
                            : 'bg-[#202020] border-[#383838] shadow-[2.5px_2.5px_0px_0px_#000]')
                        : (isUnlocked
                            ? 'bg-white border-black shadow-[3px_3px_0px_0px_#000]'
                            : 'bg-[#f8f9fa] border-black/30 shadow-[2.5px_2.5px_0px_0px_#000]')
                    }`}
                  >
                    <div className={`p-3 rounded-2xl border-2 shadow-[2px_2px_0px_0px_#000] shrink-0 ${
                      isUnlocked 
                        ? `${badge.color} text-black border-black` 
                        : (isDarkTheme ? 'bg-[#303030] text-neutral-300 border-[#4a4a4a]' : 'bg-neutral-200 text-neutral-600 border-black/40')
                    }`}>
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs font-black truncate ${
                          isDarkTheme
                            ? (isUnlocked ? 'text-white' : 'text-neutral-200')
                            : (isUnlocked ? 'text-black' : 'text-neutral-800')
                        }`}>
                          {badge.title}
                        </h4>

                        {isUnlocked ? (
                          <span className="text-[10px] font-black font-mono bg-[#4ecdc4] text-black px-1.5 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_#000]">
                            ✓ Kazanıldı
                          </span>
                        ) : (
                          <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-md border ${
                            isDarkTheme
                              ? 'bg-[#303030] text-neutral-200 border-[#4a4a4a]'
                              : 'bg-neutral-200 text-neutral-800 border-black/30'
                          }`}>
                            🔒 Kilitli
                          </span>
                        )}
                      </div>

                      <p className={`text-[11px] font-bold mt-1 leading-snug ${
                        isDarkTheme
                          ? (isUnlocked ? 'text-neutral-200' : 'text-neutral-400')
                          : (isUnlocked ? 'text-neutral-700' : 'text-neutral-600')
                      }`}>
                        {badge.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border ${
                          isUnlocked 
                            ? 'bg-[#ffd43b] text-black border-black shadow-[1px_1px_0px_0px_#000]' 
                            : (isDarkTheme
                                ? 'bg-[#303030] text-neutral-200 border-[#4a4a4a]'
                                : 'bg-neutral-200 text-neutral-800 border-black/30')
                        }`}>
                          +{badge.xp} XP
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bilişsel Lob Performans Dağılımı & Seri Kalkanı */}
      {activeProfileTab === 'performance' && (
        <div className="space-y-6 animate-fade-in">
          {/* Cognitive BPI Domains */}
          <div className="neo-card p-6 shadow-[5px_5px_0px_0px_#000] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <Brain className="w-5 h-5 text-black stroke-[2.5]" />
                <span>Bilişsel Lob Performans Dağılımı</span>
              </h2>
              <span className="neo-badge bg-[#fde047] text-xs">5 Temel Alan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {cognitiveDomains.map((dom) => {
                const Icon = dom.icon;
                const percentage = Math.min(100, Math.max(10, (dom.value / 1200) * 100));
                return (
                  <div 
                    key={dom.key}
                    className="p-4 rounded-2xl border-2 border-black bg-[#fffdf7] dark:bg-[#1e1e1e] shadow-[2.5px_2.5px_0px_0px_#000] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border-2 border-black ${dom.color} text-black shadow-[1.5px_1.5px_0px_0px_#000]`}>
                          <Icon className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-xs font-black text-black dark:text-white">{dom.title}</span>
                      </div>
                      <span className="text-sm font-black font-mono text-black dark:text-white">{dom.value}</span>
                    </div>

                    <div className="w-full h-3 rounded-full border-2 border-black bg-white overflow-hidden p-0.5 shadow-[1px_1px_0px_0px_#000]">
                      <div
                        className={`h-full rounded-full border-r-2 border-black ${dom.color} transition-all duration-700`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seri Kalkanı Card */}
          <div className="neo-card p-6 shadow-[5px_5px_0px_0px_#000] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-black stroke-[2.5]" />
                <span>Seri Kalkanı (Streak Freeze)</span>
              </h2>
              <span className="neo-badge bg-[#4ecdc4] text-black">
                🛡️ {user.streakFreezeCount ?? 1} Kalkan
              </span>
            </div>

            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 leading-relaxed">
              Bir gün antrenman yapmayı unuttuğunuzda serinizin sıfırlanmaması için <strong>Seri Kalkanı</strong> otomatik olarak devreye girer.
            </p>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#fffdf5] dark:bg-[#262626] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border-2 border-black ${user.isStreakFrozen !== false ? 'bg-[#4ecdc4]' : 'bg-slate-200'}`}>
                  <ShieldCheck className="w-5 h-5 text-black stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-black dark:text-white">Seri Koruması</h4>
                  <p className="text-[11px] font-mono font-bold text-neutral-700 dark:text-neutral-300">
                    {user.isStreakFrozen !== false ? '🛡️ Aktif - Koruma devrede' : '⚠️ Kapalı - Korumasız'}
                  </p>
                </div>
              </div>

              {/* Neo-Brutalism Switch Toggle */}
              <button
                type="button"
                onClick={toggleStreakFreeze}
                className={`w-14 h-7 rounded-full border-2 border-black p-0.5 transition-colors shadow-[2px_2px_0px_0px_#000] ${
                  user.isStreakFrozen !== false ? 'bg-[#4ecdc4]' : 'bg-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 border-black bg-white transition-transform ${
                  user.isStreakFrozen !== false ? 'translate-x-7' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <button
              type="button"
              onClick={buyStreakFreeze}
              className="neo-btn bg-[#ffd43b] text-black w-full py-2.5 text-xs shadow-[3px_3px_0px_0px_#000] hover:bg-amber-300"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Yedek Kalkan Ekle (+1 Kalkan)</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Ayarlar Section */}
      {activeProfileTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          {/* Left Column: Demographic & Goal Customization Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="neo-card p-6 shadow-[5px_5px_0px_0px_#000] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <Target className="w-5 h-5 text-black stroke-[2.5]" />
                <span>Bilişsel Hedef & Profil Bilgileri</span>
              </h2>
              {profileSuccessMsg && (
                <span className="neo-badge bg-[#4ecdc4] text-xs font-black animate-fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {profileSuccessMsg}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Username */}
              <div>
                <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-black bg-white shadow-[2.5px_2.5px_0px_0px_#000] text-black text-sm font-bold focus:outline-none focus:bg-amber-50"
                />
              </div>

              {/* Primary Goal */}
              <div>
                <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">
                  Öncelikli Gelişim Alanı
                </label>
                <select
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-black bg-white shadow-[2.5px_2.5px_0px_0px_#000] text-black text-sm font-bold focus:outline-none focus:bg-amber-50"
                >
                  <option value="GENERAL">🌟 Tüm Alanlar (Dengeli)</option>
                  <option value="MEMORY">🎯 Hafıza & Hatırlama Gücü</option>
                  <option value="ATTENTION">⚡ Odaklanma & Dikkat</option>
                  <option value="SPEED">🚀 Reaksiyon Hızı</option>
                  <option value="LOGIC">🧩 Mantık & Problem Çözme</option>
                </select>
              </div>

              {/* Birth Year */}
              <div>
                <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">
                  Doğum Yılı <span className="text-neutral-600 font-normal">(Yaş kıyaslaması için)</span>
                </label>
                <input
                  type="number"
                  placeholder="Örn: 1998"
                  min={1940}
                  max={2020}
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-black bg-white shadow-[2.5px_2.5px_0px_0px_#000] text-black text-sm font-bold focus:outline-none focus:bg-amber-50"
                />
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-xs font-black text-black uppercase font-mono mb-1.5">
                  Meslek / Çalışma Alanı
                </label>
                <input
                  type="text"
                  placeholder="Örn: Yazılımcı, Öğrenci..."
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-black bg-white shadow-[2.5px_2.5px_0px_0px_#000] text-black text-sm font-bold focus:outline-none focus:bg-amber-50"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="neo-btn bg-[#ff6b6b] text-black px-6 py-2.5 text-xs shadow-[3px_3px_0px_0px_#000] hover:bg-[#fa5252] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSavingProfile ? 'Kaydediliyor...' : 'Profil Bilgilerini Kaydet'}</span>
            </button>
          </form>

        </div>

        {/* Right Column: Audio & Reminder Settings & Logout */}
        <div className="space-y-6">
          
          {/* Settings Panel */}
          <div className="neo-card p-6 shadow-[5px_5px_0px_0px_#000] space-y-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h2 className="text-lg font-black text-black flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-black stroke-[2.5]" />
                <span>Uygulama Ayarları</span>
              </h2>
              {settingsSuccessMsg && (
                <span className="neo-badge bg-[#4ecdc4] text-[10px]">
                  ✓ Kaydedildi
                </span>
              )}
            </div>

            {/* Sound Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-black">Ses Efektleri</h4>
                  <p className="text-xs font-bold text-neutral-600">Oyun içi bilişsel sesli geri bildirimler</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSound(!soundEnabled)}
                  className={`w-14 h-7 rounded-full border-2 border-black p-0.5 transition-colors shadow-[2px_2px_0px_0px_#000] ${
                    soundEnabled ? 'bg-[#4ecdc4]' : 'bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 border-black bg-white transition-transform ${
                    soundEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Volume Slider */}
              {soundEnabled && (
                <div className="space-y-1.5 pt-1 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-700">
                    <span>Ses Seviyesi</span>
                    <span className="text-black font-black">{Math.round(soundVolume)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={soundVolume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="border-t-2 border-black pt-4 space-y-4">
              {/* Daily Reminder */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-black flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>Günlük Hatırlatıcı</span>
                  </h4>
                  <p className="text-xs font-bold text-neutral-600">Antrenman serisini koruma uyarısı</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleReminder(!dailyReminder)}
                  className={`w-14 h-7 rounded-full border-2 border-black p-0.5 transition-colors shadow-[2px_2px_0px_0px_#000] ${
                    dailyReminder ? 'bg-[#ffd43b]' : 'bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 border-black bg-white transition-transform ${
                    dailyReminder ? 'translate-x-7' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {dailyReminder && (
                <div className="flex items-center justify-between pt-1 animate-fade-in">
                  <span className="text-xs font-mono font-black text-black">Hatırlatma Saati:</span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => handleReminderTimeChange(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border-2 border-black text-black text-xs font-mono font-black shadow-[2px_2px_0px_0px_#000] outline-none"
                  />
                </div>
              )}
            </div>

            {/* Tema & Arka Plan Modu Selection */}
            <div className="border-t-2 border-black pt-4 space-y-3">
              <div>
                <h4 className="text-sm font-black text-black flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>Tema & Arka Plan Modu</span>
                </h4>
                <p className="text-xs font-bold text-neutral-600">Sitenin genel görünümünü ve siyah arka plan tercihini özelleştirin</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleThemeChange('LIGHT_WHITE')}
                  className={`p-3 rounded-2xl border-2 border-black flex items-center justify-between text-xs font-black transition-all ${
                    selectedTheme !== 'DARK_BLACK' && selectedTheme !== 'DARK'
                      ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-black shadow-[1px_1px_0px_0px_#000]" style={{ backgroundColor: '#fbf7ee' }} />
                    <span>Klasik (Krem)</span>
                  </div>
                  {selectedTheme !== 'DARK_BLACK' && selectedTheme !== 'DARK' && <CheckCircle2 className="w-4 h-4 text-black stroke-[2.5]" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange('DARK_BLACK')}
                  className={`p-3 rounded-2xl border-2 border-black flex items-center justify-between text-xs font-black transition-all ${
                    selectedTheme === 'DARK_BLACK' || selectedTheme === 'DARK'
                      ? 'bg-[#121212] text-white shadow-[3px_3px_0px_0px_#fde047] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-neutral-900 text-white shadow-[2px_2px_0px_0px_#000] hover:bg-black'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-white shadow-[1px_1px_0px_0px_#fff]" style={{ backgroundColor: '#121212' }} />
                    <span>Siyah Arka Plan</span>
                  </div>
                  {(selectedTheme === 'DARK_BLACK' || selectedTheme === 'DARK') && <CheckCircle2 className="w-4 h-4 text-[#fde047] stroke-[2.5]" />}
                </button>
              </div>
            </div>
          </div>

          {/* Account Security & Logout */}
          <div className="neo-card p-6 shadow-[5px_5px_0px_0px_#000] space-y-4">
            <h3 className="text-sm font-black text-black flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Hesap Güvenliği</span>
            </h3>
            <p className="text-xs font-bold text-neutral-600">
              Oturumunuz bu cihaz üzerinde güvenle yönetilmektedir.
            </p>

            <button
              onClick={() => {
                sounds.playClick();
                logout();
                onNavigate('dashboard');
              }}
              className="neo-btn bg-[#ff6b6b] hover:bg-[#fa5252] text-black w-full py-3 text-xs shadow-[3px_3px_0px_0px_#000]"
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
              <span>Oturumu Güvenli Kapat (Çıkış Yap)</span>
            </button>
          </div>

        </div>

      </div>
      )}

    </div>
  );
};
