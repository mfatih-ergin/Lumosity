import axios from 'axios';
import { User, Game, GameSession, DailyWorkout, RadarDataPoint, TimelineDataPoint, AchievementItem } from '../types';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('neuro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: async (userData: { username: string; email: string; password: string }) => {
    const res = await api.post<{ user: User; token: string }>('/auth/register', userData);
    return res.data;
  },
  login: async (credentials: { emailOrUsername: string; password: string }) => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', credentials);
    return res.data;
  },
  guestLogin: async () => {
    const res = await api.post<{ user: User; token: string; isGuest: boolean }>('/auth/guest');
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data;
  },
  updateProfile: async (profileData: {
    username?: string;
    avatarUrl?: string;
    birthYear?: number | null;
    gender?: string | null;
    educationLevel?: string | null;
    primaryGoal?: string | null;
    occupation?: string | null;
  }) => {
    const res = await api.put<{ user: User; profile: any }>('/auth/profile', profileData);
    return res.data;
  },
  updateSettings: async (settingsData: {
    soundEnabled?: boolean;
    soundVolume?: number;
    theme?: string;
    dailyReminder?: boolean;
    reminderTime?: string;
  }) => {
    const res = await api.put<{ settings: any }>('/auth/settings', settingsData);
    return res.data;
  },
  getAchievements: async () => {
    const res = await api.get<{ achievements: AchievementItem[] }>('/auth/achievements');
    return res.data.achievements;
  },
};

// Games API
export const gamesApi = {
  getAll: async () => {
    const res = await api.get<{ games: Game[] }>('/games');
    return res.data.games;
  },
  getById: async (id: string) => {
    const res = await api.get<{ game: Game; userBest: GameSession | null; recentSessions: GameSession[] }>(`/games/${id}`);
    return res.data;
  },
  saveSession: async (sessionData: {
    gameId: string;
    score: number;
    rawAccuracy: number;
    avgReactionMs: number;
    maxLevel: number;
  }) => {
    const res = await api.post<{
      session: GameSession;
      bpiDelta: number;
      user?: User;
      newOverallBpi?: number;
      category?: string;
    }>('/games/session', sessionData);
    return res.data;
  },
  getLeaderboard: async (gameId?: string) => {
    const res = await api.get<{ leaderboard: any[]; type: string }>('/games/leaderboard', {
      params: { gameId },
    });
    return res.data;
  },
};

// Analytics API
export const analyticsApi = {
  getBpiStats: async () => {
    const res = await api.get<{
      overallBpi: number;
      streakDays: number;
      radarData: RadarDataPoint[];
      timelineData: TimelineDataPoint[];
      stats: {
        totalSessions: number;
        avgReaction: number;
        avgAccuracy: number;
      };
    }>('/analytics/bpi');
    return res.data;
  },
};

// Workout API
export const workoutApi = {
  getDaily: async () => {
    const res = await api.get<{ workout: DailyWorkout }>('/workouts/daily');
    return res.data.workout;
  },
  completeStep: async (gameId: string) => {
    const res = await api.post<{ workout: DailyWorkout; allCompleted: boolean }>('/workouts/complete', { gameId });
    return res.data;
  },
};
