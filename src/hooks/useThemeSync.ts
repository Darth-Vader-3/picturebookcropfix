import { useState, useEffect, useCallback } from 'react';
import { UserAccount } from '../components/AuthModal';

export type ThemeMode = 'day' | 'night';

export interface UseThemeSyncReturn {
  theme: ThemeMode;
  isNight: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  syncTheme: () => void;
}

/**
 * Custom unified theme synchronization hook that manages and synchronizes
 * 'day' and 'night' theme states across all components, localStorage, and DOM root.
 * Automatically re-enforces theme synchronization when app state or user login changes.
 */
export function useThemeSync(
  userAccount?: UserAccount,
  appMode?: 'shelf' | 'reading' | 'workbench' | 'admin'
): UseThemeSyncReturn {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('digipicture_theme');
      return saved === 'night' ? 'night' : 'day';
    } catch {
      return 'day';
    }
  });

  const isNight = theme === 'night';

  // Core DOM & storage synchronization routine
  const syncThemeToDOM = useCallback((targetTheme: ThemeMode) => {
    const isDark = targetTheme === 'night';
    
    // Update document element class list for Tailwind dark mode
    if (isDark) {
      document.documentElement.classList.add('dark', 'theme-night');
      document.documentElement.classList.remove('theme-day');
      document.documentElement.setAttribute('data-theme', 'night');
      document.body.style.backgroundColor = '#020617'; // slate-955
    } else {
      document.documentElement.classList.remove('dark', 'theme-night');
      document.documentElement.classList.add('theme-day');
      document.documentElement.setAttribute('data-theme', 'day');
      document.body.style.backgroundColor = '#FFFBF5'; // brand-cream
    }

    try {
      localStorage.setItem('digipicture_theme', targetTheme);
    } catch (e) {
      console.error('Failed to save theme setting:', e);
    }
  }, []);

  // Set theme programmatically
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    syncThemeToDOM(mode);
  }, [syncThemeToDOM]);

  // Toggle theme between day and night
  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'night' ? 'day' : 'night';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  // Sync routine to re-enforce theme state
  const syncTheme = useCallback(() => {
    try {
      const saved = localStorage.getItem('digipicture_theme');
      const activeTheme: ThemeMode = saved === 'night' ? 'night' : 'day';
      if (activeTheme !== theme) {
        setThemeState(activeTheme);
      }
      syncThemeToDOM(activeTheme);
    } catch {
      syncThemeToDOM(theme);
    }
  }, [theme, syncThemeToDOM]);

  // Synchronize on initial mount and when theme state changes
  useEffect(() => {
    syncThemeToDOM(theme);
  }, [theme, syncThemeToDOM]);

  // Re-evaluate & synchronize theme when user account / login status changes
  useEffect(() => {
    syncTheme();
  }, [userAccount?.isLoggedIn, userAccount?.role, syncTheme]);

  // Re-evaluate & synchronize theme when application mode changes (shelf / reading / workbench)
  useEffect(() => {
    syncTheme();
  }, [appMode, syncTheme]);

  // Listen for cross-tab or window storage events to keep all views synchronized
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'digipicture_theme' && e.newValue) {
        const newMode: ThemeMode = e.newValue === 'night' ? 'night' : 'day';
        setThemeState(newMode);
        syncThemeToDOM(newMode);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [syncThemeToDOM]);

  return {
    theme,
    isNight,
    setTheme,
    toggleTheme,
    syncTheme
  };
}

export default useThemeSync;
