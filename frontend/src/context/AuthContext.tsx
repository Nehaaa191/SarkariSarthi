import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { api, setAccessToken, getAccessToken } from '../lib/api';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  avatar?: string;
  authProvider?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sarkari_user');
        return saved ? JSON.parse(saved) : null;
      }
    } catch {
      return null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const token = getAccessToken();
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await api.get<{ success: boolean; user: User }>('/auth/me');
        if (isMounted && res && res.user) {
          setUser(res.user);
          try {
            localStorage.setItem('sarkari_user', JSON.stringify(res.user));
          } catch {}
        }
      } catch {
        // Token invalid or expired
        if (isMounted) {
          setAccessToken(null);
          setUser(null);
          try {
            localStorage.removeItem('sarkari_user');
          } catch {}
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (accessToken: string, loggedInUser: User) => {
    setAccessToken(accessToken);
    setUser(loggedInUser);
    try {
      localStorage.setItem('sarkari_user', JSON.stringify(loggedInUser));
    } catch {}
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout notification error:', err);
    } finally {
      setAccessToken(null);
      setUser(null);
      try {
        localStorage.removeItem('sarkari_user');
      } catch {}
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
