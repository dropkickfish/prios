import { useTheme } from './ThemeProvider';

type Accent = 'cobalt' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'graphite';

const accents: Array<{ id: Accent; label: string; sampleClass: string }> = [
  { id: 'cobalt', label: 'Cobalt', sampleClass: 'bg-blue-600' },
  { id: 'cyan', label: 'Cyan', sampleClass: 'bg-cyan-500' },
  { id: 'emerald', label: 'Emerald', sampleClass: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', sampleClass: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', sampleClass: 'bg-rose-500' },
  { id: 'graphite', label: 'Graphite', sampleClass: 'bg-slate-600' },
];

export const AccentController = () => {
  const { accent, setAccent } = useTheme();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {accents.map((item) => {
        const active = accent === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setAccent(item.id)}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold tracking-wide transition-colors ${
              active
                ? 'border-base-content/35 bg-base-100 text-base-content'
                : 'border-base-content/15 bg-base-100/60 text-base-content/75 hover:border-base-content/25'
            }`}
            aria-pressed={active}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${item.sampleClass}`} aria-hidden />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
