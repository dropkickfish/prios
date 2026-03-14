import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'winter' | 'night' | 'system';
type Accent = 'cobalt' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'graphite';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accent: Accent;
  setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const normalizeAccent = (value: string | null): Accent => {
  if (value === 'indigo') return 'cobalt';
  if (value === 'cobalt' || value === 'cyan' || value === 'emerald' || value === 'amber' || value === 'rose' || value === 'graphite') {
    return value;
  }
  return 'cobalt';
};

export const ThemeProvider =({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });
  const [accent, setAccent] = useState<Accent>(() => {
    return normalizeAccent(localStorage.getItem('accent'));
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: Theme) => {
      let activeTheme = t;
      if (t === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'winter';
      }
      root.setAttribute('data-theme', activeTheme);
      if (activeTheme === 'night') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-accent', accent);
    localStorage.setItem('accent', accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
