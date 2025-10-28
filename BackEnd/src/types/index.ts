export interface User {
  id: number;
  username: string;
  email: string;
  password_hash?: string;
  google_id?: string;
  display_name?: string;
  avatar_url?: string;
  nickname_set?: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password?: string;
  google_id?: string;
  display_name?: string;
  avatar_url?: string;
  nickname_set?: boolean;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  nickname_set?: boolean;
  google_id?: string;
  created_at: Date;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
  isNewUser?: boolean;
}
