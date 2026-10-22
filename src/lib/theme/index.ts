'use client';

// ============================================================================
// Vidnoria - Theme Context & Provider
// ============================================================================
// Provides system-aware light/dark/system theme toggling, persisted in
// localStorage, with a React context + hook API.
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Theme } from '@/types';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  /** The user's chosen theme preference ('light' | 'dark' | 'system') */
  theme: Theme;
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
  /** The actual resolved theme applied to the page ('light' | 'dark') */
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'vidnoria-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read the stored theme preference from localStorage */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (e.g. incognito in some browsers)
  }
  return 'system';
}

/** Resolve 'system' to the actual OS preference */
function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
  }
  return theme;
}

/** Apply the resolved theme to the <html> element */
function applyTheme(resolved: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set the class for Tailwind dark mode
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);

  // Set a data attribute for additional CSS targeting
  root.setAttribute('data-theme', resolved);

  // Update the meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0a0a1a' : '#ffffff');
  }
}

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

interface ThemeProviderProps {
  children: ReactNode;
  /** Optional default theme (defaults to 'system') */
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // On first render, try to read from localStorage
    if (typeof window !== 'undefined') {
      return getStoredTheme();
    }
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(theme),
  );

  // Persist and apply whenever theme changes
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore write failures
    }
  }, []);

  // Resolve and apply theme whenever the preference changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Listen for OS preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia(MEDIA_QUERY);

    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Apply theme on mount (handles SSR → client hydration)
  useEffect(() => {
    applyTheme(resolveTheme(theme));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the context value using the createElement API to avoid JSX
  // transpilation issues in non-JSX files (this file is .ts, not .tsx)
  const { createElement } = require('react');
  return createElement(
    ThemeContext.Provider,
    { value: { theme, setTheme, resolvedTheme } },
    children,
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the current theme context.
 *
 * @example
 * ```tsx
 * const { theme, setTheme, resolvedTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme() must be used within a <ThemeProvider>');
  }
  return context;
}
