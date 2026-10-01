import { Router } from 'express';
import { getAllGames, getGameById, saveGameSession, getLeaderboard } from '../controllers/gameController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', getAllGames);
router.get('/leaderboard', getLeaderboard);
router.get('/:id', optionalAuth, getGameById);
router.post('/session', optionalAuth, saveGameSession);

export default router;
