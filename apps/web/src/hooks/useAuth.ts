import { useContext } from 'react';

import type { AuthContextType } from '@/context/auth-context';
import { AuthContext } from '@/context/auth-context';

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
