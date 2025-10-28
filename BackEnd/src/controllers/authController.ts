import type { Request, Response, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService.js';
import type { AuthRequest } from '../middleware/auth.js';
import { UserModel } from '../models/User.js';

export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

export const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await AuthService.register(req.body);
      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await AuthService.login(req.body);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(401).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  static getProfile: RequestHandler = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      if (!authReq.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await UserModel.findById(authReq.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json(UserModel.toUserResponse(user));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      // After successful Google authentication
      // This will be handled by passport
      const profile = (req as any).user;
      const result = await AuthService.googleAuth(profile);
      
      // Redirect based on whether user needs to set nickname
      const needsNickname = result.user.nickname_set === false;
      const redirectUrl = needsNickname 
        ? `${process.env.FRONTEND_URL}/auth/callback?token=${result.token}&needsNickname=true`
        : `${process.env.FRONTEND_URL}/auth/callback?token=${result.token}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      if (error instanceof Error) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`);
      }
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=Authentication failed`);
    }
  }

  static setNickname = [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        const authReq = req as AuthRequest;
        if (!authReq.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { username } = req.body;

        // Check if username is already taken
        const existingUser = await UserModel.findByUsername(username);
        if (existingUser && existingUser.id !== authReq.user.id) {
          return res.status(400).json({ error: 'Username already taken' });
        }

        // Update the user's nickname
        const updatedUser = await UserModel.updateNickname(authReq.user.id, username);

        return res.status(200).json({
          user: UserModel.toUserResponse(updatedUser),
        });
      } catch (error) {
        return res.status(500).json({ error: 'Failed to update nickname' });
      }
    }
  ];
}
