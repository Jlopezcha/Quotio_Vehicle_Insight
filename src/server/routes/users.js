import { Router } from 'express';
import User from '../../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId, 'email createdAt');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
