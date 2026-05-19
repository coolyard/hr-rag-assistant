import { type FC, useCallback, useEffect, useRef, useState } from 'react';

import styles from '@/components/Theme/ThemeToggle.module.css';
import { type ThemeMode, useTheme } from '@/context/ThemeContext';

const MODE_ICONS: Record<ThemeMode, string> = {
  light: '☼',
  dark: '☾',
  system: '◐',
};

const MODE_LABELS: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

const MODE_ORDER: ThemeMode[] = ['light', 'dark', 'system'];

export const ThemeToggle: FC = () => {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (m: ThemeMode) => {
      setMode(m);
      setOpen(false);
    },
    [setMode],
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.toggleButton}
        onClick={handleToggle}
        type="button"
        aria-label="切换主题"
      >
        {MODE_ICONS[mode]}
      </button>
      {open && (
        <div className={styles.dropdown}>
          {MODE_ORDER.map((m) => (
            <button
              key={m}
              className={`${styles.option} ${m === mode ? styles.optionActive : ''}`}
              onClick={() => {
                handleSelect(m);
              }}
              type="button"
            >
              <span className={styles.optionIcon}>{MODE_ICONS[m]}</span>
              <span className={styles.optionLabel}>{MODE_LABELS[m]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
