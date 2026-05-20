import { useContext } from 'react';

import type { ThemeContextType } from '@/context/theme-context';
import { ThemeContext } from '@/context/theme-context';

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
