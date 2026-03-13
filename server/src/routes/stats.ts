import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db.js';
import { eq, desc } from 'drizzle-orm';
import { getOrCreateTodayStats } from '../lib/stats.js';

const statsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/stats/abandon', async () => {
    const stats = await getOrCreateTodayStats();
    await db.update(schema.userStats)
      .set({ abandonedCount: (stats.abandonedCount || 0) + 1 })
      .where(eq(schema.userStats.date, stats.date));
    return { success: true };
  });

  fastify.get('/stats', async () => {
    const allStats = await db.select().from(schema.userStats).orderBy(desc(schema.userStats.date));

    // Calculate streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayStat = allStats.find(s => s.date === dateStr);

      if (dayStat && (dayStat.completedCount || 0) > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If today is 0 completion, streak might still be alive if yesterday was > 0
        if (dateStr === today) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    // Calculate velocity (last 7 days average completions)
    const last7Days = allStats.slice(0, 7);
    const totalCompleted = last7Days.reduce((sum, s) => sum + (s.completedCount || 0), 0);
    const weeklyVelocity = totalCompleted / (last7Days.length || 1);

    // Efficiency
    const totalC = allStats.reduce((sum, s) => sum + (s.completedCount || 0), 0);
    const totalA = allStats.reduce((sum, s) => sum + (s.abandonedCount || 0), 0);
    const efficiency = totalC === 0 ? 0 : (totalC / (totalC + totalA)) * 100;

    // Heatmap & velocity: last 84 days (12 weeks) for heatmap; last 14 for chart
    const heatmapDays = allStats.slice(0, 84);
    const velocityDays = allStats.slice(0, 14);

    return {
      currentStreak,
      weeklyVelocity: parseFloat(weeklyVelocity.toFixed(1)),
      efficiency: Math.round(efficiency),
      history: last7Days,
      heatmapData: heatmapDays,
      velocityData: velocityDays,
    };
  });

  fastify.delete('/stats', async () => {
    await db.delete(schema.userStats);
    return { success: true };
  });

  fastify.delete('/stats/:date', async (request, reply) => {
    const { date } = request.params as any; // YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.status(400).send({ error: 'Invalid date format; use YYYY-MM-DD' });
    await db.delete(schema.userStats).where(eq(schema.userStats.date, date));
    return { success: true };
  });
};

export default statsRoutes;
