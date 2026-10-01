import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { calculateSessionPerformance, updateCognitiveBpi } from '../services/bpiService';

export const getAllGames = async (_req: Request, res: Response) => {
  try {
    const games = await prisma.game.findMany({
      orderBy: { title: 'asc' },
    });
    return res.json({ games });
  } catch (error) {
    console.error('GetAllGames error:', error);
    return res.status(500).json({ error: 'Oyunlar yüklenirken bir hata oluştu.' });
  }
};

export const getGameById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const game = await prisma.game.findUnique({
      where: { id },
    });

    if (!game) {
      return res.status(404).json({ error: 'Oyun bulunamadı.' });
    }

    let userBest = null;
    let recentSessions: any[] = [];

    if (req.userId) {
      userBest = await prisma.gameSession.findFirst({
        where: { userId: req.userId, gameId: id },
        orderBy: { score: 'desc' },
      });

      recentSessions = await prisma.gameSession.findMany({
        where: { userId: req.userId, gameId: id },
        orderBy: { completedAt: 'desc' },
        take: 5,
      });
    }

    return res.json({ game, userBest, recentSessions });
  } catch (error) {
    console.error('GetGameById error:', error);
    return res.status(500).json({ error: 'Oyun detayları yüklenemedi.' });
  }
};

export const saveGameSession = async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, score, rawAccuracy, avgReactionMs, maxLevel } = req.body;

    if (!gameId || score === undefined || rawAccuracy === undefined || avgReactionMs === undefined) {
      return res.status(400).json({ error: 'Eksik oyun oturumu verileri.' });
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      return res.status(404).json({ error: 'Geçersiz oyun kimliği.' });
    }

    // Calculate BPI performance rating for this session
    const sessionRating = calculateSessionPerformance({
      gameId,
      score: Number(score),
      rawAccuracy: Number(rawAccuracy),
      avgReactionMs: Number(avgReactionMs),
      maxLevel: Number(maxLevel || 1),
    });

    if (!req.userId) {
      // Anonymous / Guest play without persistent save
      return res.json({
        session: {
          gameId,
          score,
          rawAccuracy,
          avgReactionMs,
          maxLevel,
          bpiEarned: sessionRating,
          completedAt: new Date(),
        },
        bpiDelta: 0,
        newOverallBpi: sessionRating,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // Map Category to User BPI field
    type CategoryKey = 'memory' | 'attention' | 'speed' | 'flex' | 'logic';
    let categoryKey: CategoryKey = 'memory';
    let currentCategoryBpi = user.memoryBpi;

    switch (game.category.toUpperCase()) {
      case 'MEMORY':
        categoryKey = 'memory';
        currentCategoryBpi = user.memoryBpi;
        break;
      case 'ATTENTION':
        categoryKey = 'attention';
        currentCategoryBpi = user.attentionBpi;
        break;
      case 'SPEED':
        categoryKey = 'speed';
        currentCategoryBpi = user.speedBpi;
        break;
      case 'FLEXIBILITY':
        categoryKey = 'flex';
        currentCategoryBpi = user.flexBpi;
        break;
      case 'LOGIC':
        categoryKey = 'logic';
        currentCategoryBpi = user.logicBpi;
        break;
    }

    const { newCategoryBpi, newOverallBpi, delta } = updateCognitiveBpi(
      currentCategoryBpi,
      sessionRating,
      {
        memory: user.memoryBpi,
        attention: user.attentionBpi,
        speed: user.speedBpi,
        flex: user.flexBpi,
        logic: user.logicBpi,
      },
      categoryKey
    );

    // Update streak logic
    const now = new Date();
    let newStreak = user.streakDays;
    if (!user.lastPlayedAt) {
      newStreak = 1;
    } else {
      const last = new Date(user.lastPlayedAt);
      const diffHours = (now.getTime() - last.getTime()) / (1000 * 3600);
      if (diffHours >= 20 && diffHours <= 48) {
        newStreak += 1;
      } else if (diffHours > 48) {
        newStreak = 1;
      }
    }

    // Dynamic key update
    const updateData: any = {
      overallBpi: newOverallBpi,
      streakDays: newStreak,
      lastPlayedAt: now,
    };
    if (categoryKey === 'memory') updateData.memoryBpi = newCategoryBpi;
    if (categoryKey === 'attention') updateData.attentionBpi = newCategoryBpi;
    if (categoryKey === 'speed') updateData.speedBpi = newCategoryBpi;
    if (categoryKey === 'flex') updateData.flexBpi = newCategoryBpi;
    if (categoryKey === 'logic') updateData.logicBpi = newCategoryBpi;

    const [updatedUser, newSession] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          username: true,
          streakDays: true,
          overallBpi: true,
          memoryBpi: true,
          attentionBpi: true,
          speedBpi: true,
          flexBpi: true,
          logicBpi: true,
        },
      }),
      prisma.gameSession.create({
        data: {
          userId: user.id,
          gameId: game.id,
          score: Math.round(score),
          rawAccuracy: Number(rawAccuracy),
          avgReactionMs: Number(avgReactionMs),
          maxLevel: Number(maxLevel || 1),
          bpiEarned: sessionRating,
        },
      }),
    ]);

    // Record UserBpiHistory point for timeline / radar progression
    try {
      await prisma.userBpiHistory.create({
        data: {
          userId: user.id,
          overallBpi: newOverallBpi,
          memoryBpi: categoryKey === 'memory' ? newCategoryBpi : user.memoryBpi,
          attentionBpi: categoryKey === 'attention' ? newCategoryBpi : user.attentionBpi,
          speedBpi: categoryKey === 'speed' ? newCategoryBpi : user.speedBpi,
          flexBpi: categoryKey === 'flex' ? newCategoryBpi : user.flexBpi,
          logicBpi: categoryKey === 'logic' ? newCategoryBpi : user.logicBpi,
        },
      });
    } catch (hErr) {
      console.error('BPI history logging error:', hErr);
    }

    // Check and award achievements
    const newlyUnlockedAchievements: string[] = [];
    try {
      const existingUserAchievements = await prisma.userAchievement.findMany({
        where: { userId: user.id },
        select: { achievementId: true },
      });
      const unlockedIds = new Set(existingUserAchievements.map((ua) => ua.achievementId));

      const achievementsToAward: string[] = [];

      // First step achievement
      if (!unlockedIds.has('first-step')) {
        achievementsToAward.push('first-step');
      }
      // Streak achievements
      if (newStreak >= 3 && !unlockedIds.has('streak-3')) {
        achievementsToAward.push('streak-3');
      }
      if (newStreak >= 7 && !unlockedIds.has('streak-7')) {
        achievementsToAward.push('streak-7');
      }
      // BPI achievement
      if (newOverallBpi >= 800 && !unlockedIds.has('bpi-800')) {
        achievementsToAward.push('bpi-800');
      }
      // Speed achievement
      if (Number(avgReactionMs) < 350 && Number(rawAccuracy) >= 0.8 && !unlockedIds.has('speed-demon')) {
        achievementsToAward.push('speed-demon');
      }

      for (const achId of achievementsToAward) {
        await prisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achId,
          },
        });
        newlyUnlockedAchievements.push(achId);
      }
    } catch (achErr) {
      console.error('Achievement evaluation error:', achErr);
    }

    // Automatically check and complete this game in today's Daily Workout if present
    const todayStr = now.toISOString().split('T')[0];
    let updatedWorkout = null;
    try {
      let workout = await prisma.dailyWorkout.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: todayStr,
          },
        },
      });

      if (!workout) {
        const allGames = await prisma.game.findMany();
        if (allGames.length > 0) {
          const selectedGameIds = allGames.slice(0, 3).map((g) => g.id);
          if (!selectedGameIds.includes(game.id) && allGames.some((g) => g.id === game.id)) {
            selectedGameIds[0] = game.id;
          }

          workout = await prisma.dailyWorkout.create({
            data: {
              userId: user.id,
              date: todayStr,
              gamesConfig: JSON.stringify(
                selectedGameIds.map((id, index) => ({
                  gameId: id,
                  completed: false,
                  order: index + 1,
                  phase: index === 0 ? 'Isınma (Hız & Esneklik)' : index === 1 ? 'Ana Görev (Dikkat / Hafıza)' : 'Zirve Mücadele (Problem Çözme)',
                }))
              ),
            },
          });
        }
      }

      if (workout) {
        const parsedGames = JSON.parse(workout.gamesConfig) as Array<{
          gameId: string;
          completed: boolean;
          order: number;
          phase: string;
        }>;

        let hasChange = false;

        const updatedGames = parsedGames.map((item) => {
          if (item.gameId === game.id) {
            hasChange = true;
            return { ...item, completed: true };
          }
          return item;
        });

        const allDone = updatedGames.length > 0 && updatedGames.every((g) => g.completed);

        if (hasChange) {
          updatedWorkout = await prisma.dailyWorkout.update({
            where: { id: workout.id },
            data: {
              gamesConfig: JSON.stringify(updatedGames),
              isCompleted: allDone,
              completedAt: allDone ? new Date() : null,
            },
          });
        }
      }
    } catch (wErr) {
      console.error('Auto workout completion error:', wErr);
    }

    return res.status(201).json({
      session: newSession,
      bpiDelta: delta,
      user: updatedUser,
      category: categoryKey,
      workout: updatedWorkout,
      newAchievements: newlyUnlockedAchievements,
    });
  } catch (error) {
    console.error('SaveGameSession error:', error);
    return res.status(500).json({ error: 'Oyun sonucu kaydedilemedi.' });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.query;

    if (gameId && typeof gameId === 'string') {
      const topSessions = await prisma.gameSession.findMany({
        where: { gameId },
        orderBy: { score: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              overallBpi: true,
            },
          },
        },
      });

      return res.json({ leaderboard: topSessions, type: 'game' });
    }

    const topUsers = await prisma.user.findMany({
      orderBy: { overallBpi: 'desc' },
      take: 10,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        overallBpi: true,
        streakDays: true,
      },
    });

    return res.json({ leaderboard: topUsers, type: 'overall' });
  } catch (error) {
    console.error('GetLeaderboard error:', error);
    return res.status(500).json({ error: 'Liderlik tablosu alınamadı.' });
  }
};
