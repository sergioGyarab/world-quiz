import { Router } from 'express';
import passport from 'passport';
import { AuthController, registerValidation, loginValidation } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Local authentication routes
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  AuthController.googleCallback
);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/nickname', authenticate, ...AuthController.setNickname);

export default router;
