import { pool } from '../db/index.js';
import type { User, CreateUserDTO, UserResponse } from '../types/index.js';

export class UserModel {
  static async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] || null;
  }

  static async create(userData: CreateUserDTO): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, google_id, display_name, avatar_url, nickname_set)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userData.username,
        userData.email,
        userData.password || null,
        userData.google_id || null,
        userData.display_name || userData.username,
        userData.avatar_url || null,
        userData.nickname_set !== undefined ? userData.nickname_set : true,
      ]
    );
    return result.rows[0];
  }

  static async updateLastLogin(id: number): Promise<void> {
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
  }

  static async updateNickname(id: number, username: string): Promise<User> {
    const result = await pool.query(
      `UPDATE users SET username = $1, nickname_set = TRUE, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [username, id]
    );
    return result.rows[0];
  }

  static toUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      nickname_set: user.nickname_set,
      google_id: user.google_id,
      created_at: user.created_at,
    };
  }
}
