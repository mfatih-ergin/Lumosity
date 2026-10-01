import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const getUserAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        gameSessions: {
          orderBy: { completedAt: 'desc' },
          take: 30,
          include: {
            game: {
              select: {
                title: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    // Format Radar Data
    const radarData = [
      { domain: 'Hafıza', key: 'memory', bpi: user.memoryBpi, fullMark: 1500 },
      { domain: 'Dikkat', key: 'attention', bpi: user.attentionBpi, fullMark: 1500 },
      { domain: 'Hız', key: 'speed', bpi: user.speedBpi, fullMark: 1500 },
      { domain: 'Esneklik', key: 'flex', bpi: user.flexBpi, fullMark: 1500 },
      { domain: 'Mantık', key: 'logic', bpi: user.logicBpi, fullMark: 1500 },
    ];

    // Compute Timeline Chart Data (Chronological)
    const timelineData = [...user.gameSessions]
      .reverse()
      .map((session, index) => ({
        index: index + 1,
        date: new Date(session.completedAt).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        score: session.score,
        bpiEarned: session.bpiEarned,
        accuracy: Math.round(session.rawAccuracy * 100),
        reactionTime: Math.round(session.avgReactionMs),
        gameTitle: session.game.title,
        category: session.game.category,
      }));

    // Stats aggregates
    const totalSessions = user.gameSessions.length;
    const avgReaction = totalSessions > 0
      ? Math.round(user.gameSessions.reduce((acc, s) => acc + s.avgReactionMs, 0) / totalSessions)
      : 0;
    const avgAccuracy = totalSessions > 0
      ? Math.round((user.gameSessions.reduce((acc, s) => acc + s.rawAccuracy, 0) / totalSessions) * 100)
      : 0;

    return res.json({
      overallBpi: user.overallBpi,
      streakDays: user.streakDays,
      radarData,
      timelineData,
      stats: {
        totalSessions,
        avgReaction,
        avgAccuracy,
      },
    });
  } catch (error) {
    console.error('GetUserAnalytics error:', error);
    return res.status(500).json({ error: 'Analitik verileri yüklenemedi.' });
  }
};
