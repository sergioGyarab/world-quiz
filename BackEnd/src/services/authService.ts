import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserModel } from '../models/User.js';
import type { RegisterDTO, LoginDTO, AuthResponse } from '../types/index.js';

export class AuthService {
  static async register(data: RegisterDTO): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await UserModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const existingUsername = await UserModel.findByUsername(data.username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await UserModel.create({
      username: data.username,
      email: data.email,
      password: passwordHash,
      display_name: data.username,
    });

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: UserModel.toUserResponse(user),
      token,
    };
  }

  static async login(data: LoginDTO): Promise<AuthResponse> {
    // Find user by email or username
    let user = await UserModel.findByEmail(data.email);
    
    // If not found by email, try username (in case user entered username)
    if (!user) {
      user = await UserModel.findByUsername(data.email);
    }
    
    if (!user) {
      throw new Error('Invalid email/username or password');
    }

    // Check if user has a password (not OAuth-only account)
    if (!user.password_hash) {
      throw new Error('This account uses Google Sign-In. Please login with Google.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email/username or password');
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: UserModel.toUserResponse(user),
      token,
    };
  }

  static async googleAuth(profile: any): Promise<AuthResponse> {
    // Check if user exists with this Google ID
    let user = await UserModel.findByGoogleId(profile.id);
    let isNewUser = false;

    if (!user) {
      // Check if email already exists
      const existingUser = await UserModel.findByEmail(profile.emails[0].value);
      if (existingUser) {
        throw new Error('An account with this email already exists. Please login with your password.');
      }

      // Create new user with nickname_set = false
      user = await UserModel.create({
        username: profile.emails[0].value.split('@')[0],
        email: profile.emails[0].value,
        google_id: profile.id,
        display_name: profile.displayName,
        avatar_url: profile.photos?.[0]?.value,
        nickname_set: false,
      });
      isNewUser = true;
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user: UserModel.toUserResponse(user),
      token,
      isNewUser,
    };
  }

  static generateToken(userId: number): string {
    return jwt.sign({ userId }, config.jwt.secret, {
      expiresIn: '7d',
    });
  }

  static verifyToken(token: string): { userId: number } {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
