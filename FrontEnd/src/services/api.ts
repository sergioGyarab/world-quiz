import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  nickname_set?: boolean;
  google_id?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('auth_token');
    if (this.token) {
      this.setAuthHeader(this.token);
    }
  }

  private setAuthHeader(token: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  private removeAuthHeader() {
    delete axios.defaults.headers.common['Authorization'];
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.setAuthHeader(token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    this.removeAuthHeader();
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/register`, data);
    this.setToken(response.data.token);
    return response.data;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, data);
    this.setToken(response.data.token);
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response = await axios.get<User>(`${API_URL}/auth/profile`);
    return response.data;
  }

  async setNickname(username: string): Promise<{ user: User }> {
    const response = await axios.post<{ user: User }>(`${API_URL}/auth/nickname`, { username });
    return response.data;
  }

  getGoogleAuthUrl(): string {
    return `${API_URL}/auth/google`;
  }

  logout() {
    this.clearToken();
  }
}

export const apiService = new ApiService();
