import { useTheme } from './ThemeProvider';

type Theme = 'winter' | 'night' | 'system';

export const ThemeController = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; label: string }[] = [
    { id: 'winter', label: 'Light' },
    { id: 'night', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="join rounded-lg border border-base-content/10 bg-base-200/40 p-1">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`join-item btn btn-sm h-10 border-none px-4 normal-case transition-colors ${
            theme === t.id 
              ? 'bg-base-100 text-primary' 
              : 'bg-transparent text-base-content/55 hover:bg-base-content/5 hover:text-base-content/85'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{t.label}</span>
        </button>
      ))}
    </div>
  );
};
