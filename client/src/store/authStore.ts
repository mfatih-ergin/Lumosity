import { create } from 'zustand';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  setAuthModalOpen: (open: boolean, mode?: 'login' | 'register') => void;
  setUser: (user: User | null) => void;
  updateUserBpi: (overallBpi: number, streakDays?: number) => void;
  updateProfile: (data: any) => Promise<void>;
  updateSettings: (data: any) => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  toggleStreakFreeze: () => void;
  buyStreakFreeze: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('neuro_token'),
  isLoading: true,
  isAuthModalOpen: false,
  authModalMode: 'login',

  setAuthModalOpen: (open: boolean, mode: 'login' | 'register' = 'login') => {
    set({ isAuthModalOpen: open, authModalMode: mode });
  },

  setUser: (user) => set({ user }),

  updateUserBpi: (overallBpi, streakDays) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          overallBpi,
          streakDays: streakDays !== undefined ? streakDays : currentUser.streakDays,
        },
      });
    }
  },

  toggleStreakFreeze: () => {
    const currentUser = get().user;
    if (currentUser) {
      const currentActive = currentUser.isStreakFrozen ?? true;
      const count = currentUser.streakFreezeCount ?? 1;
      set({
        user: {
          ...currentUser,
          isStreakFrozen: !currentActive,
          streakFreezeCount: count,
        },
      });
    }
  },

  buyStreakFreeze: () => {
    const currentUser = get().user;
    if (currentUser) {
      const currentCount = currentUser.streakFreezeCount ?? 1;
      set({
        user: {
          ...currentUser,
          streakFreezeCount: currentCount + 1,
          isStreakFrozen: true,
        },
      });
    }
  },

  updateProfile: async (profileData) => {
    const res = await authApi.updateProfile(profileData);
    set({ user: res.user });
  },

  updateSettings: async (settingsData) => {
    if (settingsData.theme) {
      localStorage.setItem('neuro_theme', settingsData.theme);
    }
    const activeTheme = settingsData.theme || localStorage.getItem('neuro_theme') || 'LIGHT_WHITE';
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          settings: {
            soundEnabled: true,
            soundVolume: 0.8,
            dailyReminder: true,
            reminderTime: '09:00',
            ...currentUser.settings,
            ...settingsData,
            theme: activeTheme,
          },
        },
      });
    }
    try {
      const res = await authApi.updateSettings(settingsData);
      const latestUser = get().user;
      if (latestUser && res.settings) {
        set({
          user: {
            ...latestUser,
            settings: {
              ...res.settings,
              theme: localStorage.getItem('neuro_theme') || res.settings.theme || 'LIGHT_WHITE',
            },
          },
        });
      }
    } catch (err) {
      console.error('Update settings API error:', err);
    }
  },

  login: async (emailOrUsername, password) => {
    const data = await authApi.login({ emailOrUsername, password });
    localStorage.setItem('neuro_token', data.token);
    set({ user: data.user, token: data.token, isAuthModalOpen: false });
  },

  register: async (username, email, password) => {
    const data = await authApi.register({ username, email, password });
    localStorage.setItem('neuro_token', data.token);
    set({ user: data.user, token: data.token, isAuthModalOpen: false });
  },

  guestLogin: async () => {
    const data = await authApi.guestLogin();
    localStorage.setItem('neuro_token', data.token);
    set({ user: data.user, token: data.token, isAuthModalOpen: false });
  },

  logout: () => {
    localStorage.removeItem('neuro_token');
    set({ user: null, token: null });
  },

  fetchProfile: async () => {
    const token = localStorage.getItem('neuro_token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const data = await authApi.getMe();
      const savedTheme = localStorage.getItem('neuro_theme');
      if (data.user?.settings) {
        data.user.settings.theme = savedTheme || data.user.settings.theme || 'LIGHT_WHITE';
      }
      set({ user: data.user, isLoading: false });
    } catch {
      localStorage.removeItem('neuro_token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
