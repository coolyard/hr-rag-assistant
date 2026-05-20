import { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { client } from '@/api/client';
import type { AuthUser } from '@/context/auth-context';
import { AuthContext, type AuthContextType, REMEMBER_KEY, TOKEN_KEY } from '@/context/auth-context';

function decodeToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const text = new TextDecoder().decode(bytes);
    const decoded = JSON.parse(text) as {
      sub: string;
      username: string;
      role: 'employee' | 'hr';
      displayName: string;
      exp: number;
    };
    if (decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
      displayName: decoded.displayName,
    };
  } catch {
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUser(decoded);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string, remember = false) => {
    const response = await client.post<{
      access_token: string;
      user: AuthUser;
    }>('/auth/login', { username, password });

    const { access_token, user: loginUser } = response.data;
    localStorage.setItem(TOKEN_KEY, access_token);
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }
    setUser(loginUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    setUser(null);
  }, []);

  const isAuthenticated = user !== null;

  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated, isLoading, login, logout }),
    [user, isAuthenticated, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
