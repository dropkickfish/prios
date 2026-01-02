import { useTheme } from './ThemeProvider';

type Theme = 'winter' | 'night' | 'system';

export const ThemeController = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; label: string; icon: string }[] = [
    { id: 'winter', label: 'Light', icon: '☀️' },
    { id: 'night', label: 'Dark', icon: '🌙' },
    { id: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div className="join bg-base-200/50 p-1 rounded-2xl border border-base-content/5">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`join-item btn btn-sm border-none px-4 h-10 gap-2 normal-case transition-all ${
            theme === t.id 
              ? 'bg-base-100 shadow-sm text-primary' 
              : 'bg-transparent hover:bg-base-content/5 text-base-content/40'
          }`}
        >
          <span className="text-base">{t.icon}</span>
          <span className="text-[10px] font-black uppercase tracking-widest">{t.label}</span>
        </button>
      ))}
    </div>
  );
};
