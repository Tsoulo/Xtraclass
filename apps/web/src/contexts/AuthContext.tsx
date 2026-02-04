import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService, type User } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = () => {
    console.log('[AuthContext] Starting auth check...');
    try {
      if (authService.isAuthenticated()) {
        const currentUser = authService.getUser();
        console.log('[AuthContext] User authenticated:', currentUser);
        setUser(currentUser);
      } else {
        console.log('[AuthContext] No authentication found');
        setUser(null);
        authService.clearAuth();
      }
    } catch (error) {
      console.error('[AuthContext] Auth check failed:', error);
      setUser(null);
      authService.clearAuth();
    } finally {
      console.log('[AuthContext] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      if (authService.isAuthenticated()) {
        const freshUser = await authService.getCurrentUser();
        authService.setAuth(authService.getToken()!, freshUser);
        setUser(freshUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const authData = await authService.login(email, password);
      setUser(authData.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logout initiated...');
      
      // Call server logout endpoint first
      try {
        await authService.logout();
        console.log('Server logout completed');
      } catch (error) {
        console.warn('Server logout failed, but proceeding with local logout:', error);
      }
      
      // Clear TanStack Query cache to remove all cached API data
      console.log('Clearing TanStack Query cache...');
      queryClient.clear();
      
      // Clear all application-specific localStorage items
      console.log('Clearing application localStorage items...');
      const itemsToClear = [
        'tutorialFeedback',
        'homeworkFeedback',
        'completedExercise',
        'attemptingHomework',
        'attemptingExercise',
        'userGrade',
        'userSubject',
        'selectedSubject'
      ];
      
      // Clear known app-specific items
      itemsToClear.forEach(item => {
        localStorage.removeItem(item);
      });
      
      // Clear any homework_answers_* items (saved form data)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('homework_answers_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear auth state and storage
      authService.clearAuth();
      setUser(null);
      
      console.log('Logout complete - all caches cleared');
      
      // Force page reload to ensure clean state
      window.location.href = '/signin';
    } catch (error) {
      console.error('Logout failed:', error);
      // Ensure auth is cleared even if something goes wrong
      authService.clearAuth();
      setUser(null);
      queryClient.clear();
      // Still try to navigate even if there's an error
      window.location.href = '/signin';
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}