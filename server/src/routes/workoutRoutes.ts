import { Router } from 'express';
import { getDailyWorkout, completeWorkoutGame } from '../controllers/workoutController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/daily', authenticateJWT, getDailyWorkout);
router.post('/complete', authenticateJWT, completeWorkoutGame);

export default router;
