import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';

// Helper to get local date string YYYY-MM-DD
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Pick 3 random games ensuring 3 distinct categories whenever possible
const pick3DiverseRandomGames = (allGames: Array<{ id: string; category: string }>) => {
  if (allGames.length <= 3) {
    return allGames.map((g) => g.id);
  }

  // Group games by category
  const categoryMap = new Map<string, string[]>();
  for (const game of allGames) {
    const cat = (game.category || 'GENERAL').toUpperCase();
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, []);
    }
    categoryMap.get(cat)!.push(game.id);
  }

  // Shuffle categories
  const categories = Array.from(categoryMap.keys()).sort(() => Math.random() - 0.5);

  const selectedGameIds: string[] = [];

  // Pick 1 random game from up to 3 distinct categories
  for (const cat of categories) {
    if (selectedGameIds.length >= 3) break;
    const gameIdsInCat = categoryMap.get(cat)!;
    const randomGameId = gameIdsInCat[Math.floor(Math.random() * gameIdsInCat.length)];
    selectedGameIds.push(randomGameId);
  }

  // If fewer than 3 categories exist, fill remaining slots with random games
  if (selectedGameIds.length < 3) {
    const remaining = allGames
      .map((g) => g.id)
      .filter((id) => !selectedGameIds.includes(id))
      .sort(() => Math.random() - 0.5);

    for (const id of remaining) {
      if (selectedGameIds.length >= 3) break;
      selectedGameIds.push(id);
    }
  }

  return selectedGameIds;
};

export const getDailyWorkout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
    }

    const todayStr = getTodayDateString();

    // Check if workout exists for today
    let workout = await prisma.dailyWorkout.findUnique({
      where: {
        userId_date: {
          userId: req.userId,
          date: todayStr,
        },
      },
    });

    if (!workout) {
      // Pick 3 balanced games across domains
      const allGames = await prisma.game.findMany();
      if (allGames.length === 0) {
        return res.status(404).json({ error: 'Sistemde henüz oyun bulunmamaktadır.' });
      }

      const selectedGameIds = pick3DiverseRandomGames(allGames);

      workout = await prisma.dailyWorkout.create({
        data: {
          userId: req.userId,
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

    const parsedGames = JSON.parse(workout.gamesConfig) as Array<{
      gameId: string;
      completed: boolean;
      order: number;
      phase: string;
    }>;

    // Fetch game details for the workout items
    const gameIds = parsedGames.map((item) => item.gameId);
    const gameDetails = await prisma.game.findMany({
      where: { id: { in: gameIds } },
    });

    const enrichedWorkout = {
      ...workout,
      games: parsedGames.map((item) => {
        const details = gameDetails.find((g) => g.id === item.gameId);
        return {
          ...item,
          title: details?.title || item.gameId,
          category: details?.category || 'BRAIN',
          description: details?.description || '',
          accentColor: details?.accentColor || '#06b6d4',
          iconName: details?.iconName || 'Brain',
        };
      }),
    };

    return res.json({ workout: enrichedWorkout });
  } catch (error) {
    console.error('GetDailyWorkout error:', error);
    return res.status(500).json({ error: 'Günlük antrenman programı alınamadı.' });
  }
};

export const completeWorkoutGame = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
    }

    const { gameId } = req.body;
    const todayStr = getTodayDateString();

    let workout = await prisma.dailyWorkout.findUnique({
      where: {
        userId_date: {
          userId: req.userId,
          date: todayStr,
        },
      },
    });

    if (!workout) {
      const allGames = await prisma.game.findMany();
      const selectedGameIds = pick3DiverseRandomGames(allGames);
      if (!selectedGameIds.includes(gameId) && allGames.some((g) => g.id === gameId)) {
        selectedGameIds[0] = gameId;
      }

      workout = await prisma.dailyWorkout.create({
        data: {
          userId: req.userId,
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

    const parsedGames = JSON.parse(workout.gamesConfig) as Array<{
      gameId: string;
      completed: boolean;
      order: number;
      phase: string;
    }>;

    const updatedGames = parsedGames.map((item) => {
      if (item.gameId === gameId) {
        return { ...item, completed: true };
      }
      return item;
    });

    const allCompleted = updatedGames.length > 0 && updatedGames.every((g) => g.completed);

    const updatedWorkout = await prisma.dailyWorkout.update({
      where: { id: workout.id },
      data: {
        gamesConfig: JSON.stringify(updatedGames),
        isCompleted: allCompleted,
        completedAt: allCompleted ? new Date() : null,
      },
    });

    // Fetch game details to enrich response
    const gameIds = updatedGames.map((item) => item.gameId);
    const gameDetails = await prisma.game.findMany({
      where: { id: { in: gameIds } },
    });

    const enrichedWorkout = {
      ...updatedWorkout,
      games: updatedGames.map((item) => {
        const details = gameDetails.find((g) => g.id === item.gameId);
        return {
          ...item,
          title: details?.title || item.gameId,
          category: details?.category || 'BRAIN',
          description: details?.description || '',
          accentColor: details?.accentColor || '#06b6d4',
          iconName: details?.iconName || 'Brain',
        };
      }),
    };

    return res.json({ workout: enrichedWorkout, allCompleted });
  } catch (error) {
    console.error('CompleteWorkoutGame error:', error);
    return res.status(500).json({ error: 'Antrenman adımı güncellenemedi.' });
  }
};
