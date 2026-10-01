import { Router } from 'express';
import { 
  register, 
  login, 
  guestLogin, 
  getMe, 
  updateProfile, 
  updateSettings, 
  getAchievements 
} from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.get('/me', authenticateJWT, getMe);
router.put('/profile', authenticateJWT, updateProfile);
router.put('/settings', authenticateJWT, updateSettings);
router.get('/achievements', authenticateJWT, getAchievements);

export default router;
