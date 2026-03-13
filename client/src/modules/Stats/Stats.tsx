import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';

interface DayStat {
  date: string;
  completedCount?: number;
  abandonedCount?: number;
  skippedCount?: number;
}

interface StatsData {
  currentStreak: number;
  weeklyVelocity: number;
  efficiency: number;
  history: DayStat[];
  heatmapData?: DayStat[];
  velocityData?: DayStat[];
}

function intensity(completed: number, max: number): string {
  if (max <= 0 || completed <= 0) return 'bg-base-200/50';
  const ratio = completed / max;
  if (ratio >= 0.75) return 'bg-primary';
  if (ratio >= 0.5) return 'bg-primary/70';
  if (ratio >= 0.25) return 'bg-primary/40';
  return 'bg-primary/20';
}

export const Stats = () => {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: queryKeys.stats(),
    queryFn: apiClient.getStats,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-bars loading-lg text-primary"></span>
      </div>
    );
  }

  if (!stats) return <div>Failed to load stats.</div>;

  const heatmapDays = stats.heatmapData ?? [];
  const velocityDays = (stats.velocityData ?? stats.history).slice(0, 14);
  const maxCompleted = Math.max(1, ...heatmapDays.map(d => d.completedCount ?? 0));

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10">
      <header className="text-center">
        <h1 className="text-5xl font-black text-primary mb-2">Your Momentum</h1>
        <p className="opacity-50 uppercase tracking-widest text-xs font-bold">Performance & Habits</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="card bg-base-100 shadow-2xl border-b-8 border-orange-500 overflow-hidden group">
          <div className="card-body items-center text-center p-10">
            <div className="text-6xl mb-2 group-hover:scale-110 transition-transform">🔥</div>
            <h2 className="text-4xl font-black">{stats.currentStreak}</h2>
            <p className="text-xs uppercase font-black opacity-40 tracking-widest">Day Streak</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-2xl border-b-8 border-blue-500 overflow-hidden group">
          <div className="card-body items-center text-center p-10">
            <div className="text-6xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
            <h2 className="text-4xl font-black">{stats.weeklyVelocity}</h2>
            <p className="text-xs uppercase font-black opacity-40 tracking-widest">Tasks / Day</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-2xl border-b-8 border-green-500 overflow-hidden group">
          <div className="card-body items-center text-center p-10">
            <div className="text-6xl mb-2 group-hover:scale-110 transition-transform">🎯</div>
            <h2 className="text-4xl font-black">{stats.efficiency}%</h2>
            <p className="text-xs uppercase font-black opacity-40 tracking-widest">Focus Efficiency</p>
          </div>
        </div>
      </div>

      {/* Heatmap: 12 weeks × 7 days (oldest top-left, newest bottom-right) */}
      {heatmapDays.length > 0 && (
        <div className="card bg-base-100 shadow-xl p-8 border border-base-200">
          <h3 className="text-xl font-black mb-2 uppercase tracking-widest opacity-30">Activity Heatmap</h3>
          <p className="text-xs opacity-50 mb-4">Completions per day — darker = more tasks done</p>
          <div className="overflow-x-auto">
            <div className="grid gap-0.5 grid-cols-7 w-max" style={{ gridTemplateRows: `repeat(${Math.ceil(heatmapDays.length / 7)}, minmax(0, 1fr))` }}>
              {heatmapDays.slice().reverse().map((day) => (
                <div
                  key={day.date}
                  className={`w-3 h-3 rounded-sm transition-colors ${intensity(day.completedCount ?? 0, maxCompleted)}`}
                  title={`${day.date}: ${day.completedCount ?? 0} done`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] opacity-40 uppercase tracking-wider">
            <span>12 weeks ago</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* Velocity: bar chart last 14 days */}
      {velocityDays.length > 0 && (
        <div className="card bg-base-100 shadow-xl p-8 border border-base-200">
          <h3 className="text-xl font-black mb-2 uppercase tracking-widest opacity-30">Velocity (last 14 days)</h3>
          <p className="text-xs opacity-50 mb-4">Tasks completed per day</p>
          <div className="flex items-end gap-1 h-32">
            {[...velocityDays].reverse().map((day) => {
              const n = day.completedCount ?? 0;
              const max = Math.max(1, ...velocityDays.map(d => d.completedCount ?? 0));
              const h = (n / max) * 100;
              return (
                <div key={day.date} className="flex-1 min-w-0 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary rounded-t transition-all min-h-[4px]"
                    style={{ height: `${h}%` }}
                    title={`${day.date}: ${n}`}
                  />
                  <span className="text-[9px] opacity-50 truncate w-full text-center" title={day.date}>
                    {day.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-xl p-8 border border-base-200">
        <h3 className="text-xl font-black mb-6 uppercase tracking-widest opacity-30">Activity History</h3>
        <div className="flex flex-col gap-4">
          {(stats.history ?? []).map((day) => (
            <div key={day.date} className="flex justify-between items-center p-4 bg-base-200/50 rounded-2xl">
              <span className="font-bold opacity-60">{day.date}</span>
              <div className="flex gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-lg font-black">{day.completedCount ?? 0}</span>
                  <span className="text-[10px] uppercase opacity-40 font-bold">Done</span>
                </div>
                <div className="flex flex-col items-end opacity-30">
                  <span className="text-lg font-black">{day.abandonedCount ?? 0}</span>
                  <span className="text-[10px] uppercase font-bold">Skipped</span>
                </div>
              </div>
            </div>
          ))}
          {(stats.history?.length ?? 0) === 0 && (
            <p className="text-center opacity-30 py-10 font-bold uppercase tracking-widest">No activity recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
