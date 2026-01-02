import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface StatsData {
  currentStreak: number;
  weeklyVelocity: number;
  efficiency: number;
  history: any[];
}

export const Stats = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getStats().then(data => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-bars loading-lg text-primary"></span>
      </div>
    );
  }

  if (!stats) return <div>Failed to load stats.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10">
      <header className="text-center">
        <h1 className="text-5xl font-black text-primary mb-2">Your Momentum</h1>
        <p className="opacity-50 uppercase tracking-widest text-xs font-bold">Performance & Habits</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Streak Card */}
        <div className="card bg-base-100 shadow-2xl border-b-8 border-orange-500 overflow-hidden group">
          <div className="card-body items-center text-center p-10">
            <div className="text-6xl mb-2 group-hover:scale-110 transition-transform">🔥</div>
            <h2 className="text-4xl font-black">{stats.currentStreak}</h2>
            <p className="text-xs uppercase font-black opacity-40 tracking-widest">Day Streak</p>
          </div>
        </div>

        {/* Velocity Card */}
        <div className="card bg-base-100 shadow-2xl border-b-8 border-blue-500 overflow-hidden group">
          <div className="card-body items-center text-center p-10">
            <div className="text-6xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
            <h2 className="text-4xl font-black">{stats.weeklyVelocity}</h2>
            <p className="text-xs uppercase font-black opacity-40 tracking-widest">Tasks / Day</p>
          </div>
        </div>

        {/* Efficiency Card */}
        <div className="card bg-base-100 shadow-2xl border-b-8 border-green-500 overflow-hidden group">
          <div className="card-body items-center text-center p-10">
            <div className="text-6xl mb-2 group-hover:scale-110 transition-transform">🎯</div>
            <h2 className="text-4xl font-black">{stats.efficiency}%</h2>
            <p className="text-xs uppercase font-black opacity-40 tracking-widest">Focus Efficiency</p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl p-8 border border-base-200">
        <h3 className="text-xl font-black mb-6 uppercase tracking-widest opacity-30">Activity History</h3>
        <div className="flex flex-col gap-4">
           {stats.history.map((day) => (
             <div key={day.date} className="flex justify-between items-center p-4 bg-base-200/50 rounded-2xl">
                <span className="font-bold opacity-60">{day.date}</span>
                <div className="flex gap-4">
                   <div className="flex flex-col items-end">
                      <span className="text-lg font-black">{day.completedCount}</span>
                      <span className="text-[10px] uppercase opacity-40 font-bold">Done</span>
                   </div>
                   <div className="flex flex-col items-end opacity-30">
                      <span className="text-lg font-black">{day.abandonedCount}</span>
                      <span className="text-[10px] uppercase font-bold">Skipped</span>
                   </div>
                </div>
             </div>
           ))}
           {stats.history.length === 0 && (
             <p className="text-center opacity-30 py-10 font-bold uppercase tracking-widest">No activity recorded yet.</p>
           )}
        </div>
      </div>
    </div>
  );
};
