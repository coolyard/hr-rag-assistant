import { createContext } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  role: 'employee' | 'hr';
  displayName: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const TOKEN_KEY = 'hr_rag_token';
export const REMEMBER_KEY = 'hr_rag_remember';
