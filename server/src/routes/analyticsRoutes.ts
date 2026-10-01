import { Router } from 'express';
import { getUserAnalytics } from '../controllers/analyticsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/bpi', authenticateJWT, getUserAnalytics);

export default router;
