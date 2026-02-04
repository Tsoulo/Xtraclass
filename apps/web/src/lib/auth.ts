import { buildApiUrl } from "@/lib/api";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cellNumber: string | null;
  role: string;
  createdAt: string;
  points?: number;
  grade?: string;
  school?: string;
  studentId?: string;
  subjects?: string[];
  parent?: any;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

const parseJsonSafe = async <T>(response: Response): Promise<T | null> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  setAuth(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  getAuthHeaders(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(buildApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await parseJsonSafe<{ message?: string }>(response);
      throw new Error(error?.message || `Login failed (${response.status})`);
    }

    const authData = await parseJsonSafe<AuthResponse>(response);
    if (!authData) {
      throw new Error('Login failed: empty response');
    }
    this.setAuth(authData.token, authData.user);
    return authData;
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch(buildApiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }

    this.clearAuth();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(buildApiUrl('/api/auth/me'), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    const user = await parseJsonSafe<User>(response);
    if (!user) {
      throw new Error('Failed to get current user: empty response');
    }

    return user;
  }
}

export const authService = new AuthService();

// Convenience functions
export const login = async (credentials: { email: string; password: string }): Promise<{ success: boolean; error?: string }> => {
  try {
    await authService.login(credentials.email, credentials.password);
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Login failed' 
    };
  }
};

export const logout = async (): Promise<void> => {
  await authService.logout();
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    return await authService.getCurrentUser();
  } catch {
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return authService.isAuthenticated();
};