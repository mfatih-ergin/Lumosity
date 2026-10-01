import React, { useState } from 'react';
import { 
  Brain, 
  Gamepad2, 
  LineChart, 
  Calendar, 
  Flame, 
  User as UserIcon, 
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { sounds } from '../../services/soundEffects';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, setAuthModalOpen } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: Brain },
    { id: 'workout', label: 'Günün Antrenmanı', icon: Calendar },
    { id: 'games', label: 'Oyun Kütüphanesi', icon: Gamepad2 },
    { id: 'analytics', label: 'Bilişsel Rapor (BPI)', icon: LineChart },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b-[2.5px] border-black bg-[#fbf7ee] py-2.5 shadow-[0_4px_0px_0px_#000000]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
          
          {/* Logo */}
          <div 
            onClick={() => {
              sounds.playClick();
              setCurrentTab('dashboard');
            }}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#ff6b6b] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-[-2deg]">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black tracking-tight text-black whitespace-nowrap">
                NEURO<span className="bg-[#fde047] px-1 py-0.5 rounded-lg border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000] ml-0.5">CRAFT</span>
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    sounds.playClick();
                    setCurrentTab(item.id);
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap shrink-0 border-2 border-black ${
                    isActive
                      ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_#000]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-black stroke-[2.5]" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ff6b6b] text-black border border-black font-black whitespace-nowrap shadow-[1px_1px_0px_0px_#000]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Header Controls (Streak & Profile) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">

            {user ? (
              <div className="flex items-center gap-2.5 sm:gap-3.5">
                {/* Streak Badge */}
                <div 
                  title={`${user.streakDays} Günlük Antrenman Serisi`}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffbe76] border-2 border-black text-black text-xs font-black font-mono shadow-[2px_2px_0px_0px_#000] whitespace-nowrap shrink-0"
                >
                  <Flame className="w-4 h-4 text-black fill-amber-400 shrink-0" />
                  <span>{user.streakDays} GÜN</span>
                </div>

                {/* User Profile Trigger Button */}
                <button
                  onClick={() => {
                    sounds.playClick();
                    setCurrentTab('profile');
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border-2 border-black transition-all shrink-0 whitespace-nowrap ${
                    currentTab === 'profile'
                      ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000] -translate-x-[1px] -translate-y-[1px]'
                      : 'bg-white text-black shadow-[3px_3px_0px_0px_#000] hover:bg-[#fff9ea] hover:shadow-[4px_4px_0px_0px_#000]'
                  }`}
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.username}
                    className="w-7 h-7 rounded-full border-2 border-black bg-amber-100 object-cover shrink-0"
                  />
                  <span className="text-xs font-black font-mono whitespace-nowrap text-black">
                    {user.username}
                  </span>
                  <UserIcon className="w-3.5 h-3.5 text-black shrink-0 stroke-[2.5]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setAuthModalOpen(true, 'login');
                  }}
                  className="px-3.5 py-1.5 rounded-xl border-2 border-black bg-white text-black text-xs font-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea] transition-all"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => {
                    sounds.playClick();
                    setAuthModalOpen(true, 'register');
                  }}
                  className="px-4 py-1.5 rounded-xl border-2 border-black bg-[#ff6b6b] text-black text-xs font-black shadow-[3px_3px_0px_0px_#000] hover:bg-[#fa5252] transition-all"
                >
                  Kayıt Ol
                </button>
              </div>
            )}

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] text-black"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t-2 border-black bg-[#fffdf5] px-4 pt-3 pb-4 space-y-2 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  sounds.playClick();
                  setCurrentTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-black border-2 border-black transition-all ${
                  isActive
                    ? 'bg-[#fde047] text-black shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#fff9ea]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6b6b] text-black border border-black font-black">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          {user && (
            <button
              onClick={() => {
                sounds.playClick();
                setCurrentTab('profile');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-black border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#000]"
            >
              <UserIcon className="w-4 h-4 text-black" />
              <span>Profilim</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
