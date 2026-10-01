export interface UserProfileData {
  id?: string;
  birthYear?: number | null;
  gender?: string | null;
  educationLevel?: string | null;
  primaryGoal?: string | null;
  occupation?: string | null;
}

export interface UserSettingsData {
  id?: string;
  soundEnabled: boolean;
  soundVolume: number;
  theme: string;
  dailyReminder: boolean;
  reminderTime: string;
}

export interface UserDuelStatsData {
  id?: string;
  eloRating: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  currentWinStreak: number;
  bestWinStreak: number;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  category: string;
  requiredValue: number;
  xpReward: number;
  unlocked?: boolean;
  unlockedAt?: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  streakDays: number;
  streakFreezeCount?: number;
  isStreakFrozen?: boolean;
  overallBpi: number;
  memoryBpi: number;
  attentionBpi: number;
  speedBpi: number;
  flexBpi: number;
  logicBpi: number;
  createdAt?: string;
  lastPlayedAt?: string;
  profile?: UserProfileData;
  settings?: UserSettingsData;
  duelStats?: UserDuelStatsData;
  achievements?: Array<{
    achievementId: string;
    unlockedAt: string;
    achievement: AchievementItem;
  }>;
  _count?: {
    gameSessions?: number;
  };
}

export type CognitiveCategory = 'MEMORY' | 'ATTENTION' | 'SPEED' | 'FLEXIBILITY' | 'LOGIC' | 'LANGUAGE';

export interface Game {
  id: string;
  title: string;
  category: CognitiveCategory;
  description: string;
  instructions?: string;
  iconName?: string;
  accentColor?: string;
}

export interface GameSession {
  id: string;
  userId: string;
  gameId: string;
  score: number;
  rawAccuracy: number;
  avgReactionMs: number;
  maxLevel: number;
  bpiEarned: number;
  completedAt: string;
  game?: {
    title: string;
    category: CognitiveCategory;
  };
}

export interface DailyWorkoutItem {
  gameId: string;
  completed: boolean;
  order: number;
  phase: string;
  title: string;
  category: CognitiveCategory;
  description: string;
  accentColor: string;
  iconName: string;
}

export interface DailyWorkout {
  id: string;
  userId: string;
  date: string;
  isCompleted: boolean;
  games: DailyWorkoutItem[];
}

export interface RadarDataPoint {
  domain: string;
  key: string;
  bpi: number;
  fullMark: number;
}

export interface TimelineDataPoint {
  index: number;
  date: string;
  score: number;
  bpiEarned: number;
  accuracy: number;
  reactionTime: number;
  gameTitle: string;
  category: string;
}

export interface DuelPlayer {
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string;
  bpi: number;
}

export interface DuelRoomState {
  roomId: string;
  gameId: string;
  seed: string;
  durationSeconds: number;
  player1: DuelPlayer;
  player2: DuelPlayer;
  p1Score: number;
  p2Score: number;
  p1Combo: number;
  p2Combo: number;
  isFinished: boolean;
  winnerId?: string | null;
  winnerUsername?: string;
  isTie?: boolean;
}
