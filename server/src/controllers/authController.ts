import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super-neuro-lumosity-secret-jwt-key-2026';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı, e-posta ve şifre zorunludur.' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        streakDays: true,
        overallBpi: true,
        memoryBpi: true,
        attentionBpi: true,
        speedBpi: true,
        flexBpi: true,
        logicBpi: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Kayıt işlemi sırasında bir hata oluştu.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Kullanıcı bilgisi ve şifre zorunludur.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz e-posta/kullanıcı adı veya şifre.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Geçersiz e-posta/kullanıcı adı veya şifre.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { passwordHash: _, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Giriş işlemi sırasında bir hata oluştu.' });
  }
};

export const guestLogin = async (_req: Request, res: Response) => {
  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const guestUsername = `NeuroGuest_${randomSuffix}`;
    const guestEmail = `guest_${randomSuffix}_${Date.now()}@neurocraft.local`;
    const passwordHash = await bcrypt.hash('guest_pass_123', 8);

    const user = await prisma.user.create({
      data: {
        username: guestUsername,
        email: guestEmail,
        passwordHash,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestUsername}`,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        streakDays: true,
        overallBpi: true,
        memoryBpi: true,
        attentionBpi: true,
        speedBpi: true,
        flexBpi: true,
        logicBpi: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user, token, isGuest: true });
  } catch (error) {
    console.error('Guest login error:', error);
    return res.status(500).json({ error: 'Misafir girişi oluşturulamadı.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
    }

    let user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        profile: true,
        settings: true,
        duelStats: true,
        achievements: {
          include: {
            achievement: true,
          },
        },
        _count: {
          select: {
            gameSessions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // Initialize default profile and settings if not present
    if (!user.settings) {
      const settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          soundEnabled: true,
          soundVolume: 0.8,
          theme: 'DARK',
          dailyReminder: true,
          reminderTime: '09:00',
        },
      });
      user = { ...user, settings };
    }

    if (!user.profile) {
      const profile = await prisma.userProfile.create({
        data: {
          userId: user.id,
          primaryGoal: 'GENERAL',
        },
      });
      user = { ...user, profile };
    }

    if (!user.duelStats) {
      const duelStats = await prisma.userDuelStats.create({
        data: {
          userId: user.id,
          eloRating: 1200,
        },
      });
      user = { ...user, duelStats };
    }

    const { passwordHash: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ error: 'Kullanıcı profili alınamadı.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
    }

    const { username, avatarUrl, birthYear, gender, educationLevel, primaryGoal, occupation } = req.body;

    // Update user base fields if provided
    if (username || avatarUrl) {
      const updateData: any = {};
      if (username) {
        // Check uniqueness if changing
        const existing = await prisma.user.findFirst({
          where: { username, NOT: { id: req.userId } },
        });
        if (existing) {
          return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }
        updateData.username = username;
      }
      if (avatarUrl) {
        updateData.avatarUrl = avatarUrl;
      }
      await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
      });
    }

    // Upsert UserProfile
    const profile = await prisma.userProfile.upsert({
      where: { userId: req.userId },
      update: {
        birthYear: birthYear !== undefined ? (birthYear ? Number(birthYear) : null) : undefined,
        gender: gender !== undefined ? gender : undefined,
        educationLevel: educationLevel !== undefined ? educationLevel : undefined,
        primaryGoal: primaryGoal !== undefined ? primaryGoal : undefined,
        occupation: occupation !== undefined ? occupation : undefined,
      },
      create: {
        userId: req.userId,
        birthYear: birthYear ? Number(birthYear) : null,
        gender: gender || null,
        educationLevel: educationLevel || null,
        primaryGoal: primaryGoal || 'GENERAL',
        occupation: occupation || null,
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        profile: true,
        settings: true,
        duelStats: true,
        achievements: {
          include: { achievement: true },
        },
      },
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    const { passwordHash: _, ...safeUser } = updatedUser;
    return res.json({ user: safeUser, profile });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    return res.status(500).json({ error: 'Profil güncellenirken bir hata oluştu.' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
    }

    const { soundEnabled, soundVolume, theme, dailyReminder, reminderTime } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.userId },
      update: {
        soundEnabled: soundEnabled !== undefined ? Boolean(soundEnabled) : undefined,
        soundVolume: soundVolume !== undefined ? Number(soundVolume) : undefined,
        theme: theme !== undefined ? String(theme) : undefined,
        dailyReminder: dailyReminder !== undefined ? Boolean(dailyReminder) : undefined,
        reminderTime: reminderTime !== undefined ? String(reminderTime) : undefined,
      },
      create: {
        userId: req.userId,
        soundEnabled: soundEnabled !== undefined ? Boolean(soundEnabled) : true,
        soundVolume: soundVolume !== undefined ? Number(soundVolume) : 0.8,
        theme: theme || 'DARK',
        dailyReminder: dailyReminder !== undefined ? Boolean(dailyReminder) : true,
        reminderTime: reminderTime || '09:00',
      },
    });

    return res.json({ settings });
  } catch (error) {
    console.error('UpdateSettings error:', error);
    return res.status(500).json({ error: 'Ayarlar güncellenirken bir hata oluştu.' });
  }
};

export const getAchievements = async (req: AuthRequest, res: Response) => {
  try {
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { category: 'asc' },
    });

    let unlockedMap: Record<string, string> = {};
    if (req.userId) {
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId: req.userId },
      });
      userAchievements.forEach((ua) => {
        unlockedMap[ua.achievementId] = ua.unlockedAt.toISOString();
      });
    }

    const result = allAchievements.map((ach) => ({
      ...ach,
      unlocked: Boolean(unlockedMap[ach.id]),
      unlockedAt: unlockedMap[ach.id] || null,
    }));

    return res.json({ achievements: result });
  } catch (error) {
    console.error('GetAchievements error:', error);
    return res.status(500).json({ error: 'Başarımlar yüklenirken bir hata oluştu.' });
  }
};
