import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fetchMe, logout as apiLogout, refreshTokens } from '../api/auth';
import type { MeResponse } from '../api/auth';

interface AuthContextValue {
  user: MeResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  signIn: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<MeResponse['profile']>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken'),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem('refreshToken'),
  );
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    fetchMe(accessToken)
      .then(setUser)
      .catch(async () => {
        if (refreshToken) {
          try {
            const tokens = await refreshTokens(refreshToken);
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            setAccessToken(tokens.accessToken);
            setRefreshToken(tokens.refreshToken);
            const me = await fetchMe(tokens.accessToken);
            setUser(me);
            return;
          } catch {}
        }
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  async function signIn(tokens: { accessToken: string; refreshToken: string }) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    const me = await fetchMe(tokens.accessToken);
    setUser(me);
  }

  function updateUser(patch: Partial<MeResponse['profile']>) {
    setUser((prev) => prev ? { ...prev, profile: { ...prev.profile, ...patch } } : prev);
  }

  async function signOut() {
    if (accessToken) {
      await apiLogout(accessToken).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, isLoading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
