export const userStatRecord = {
  type: 'object',
  properties: {
    date: { type: 'string', description: 'YYYY-MM-DD' },
    difficultySum: { type: 'integer', nullable: true },
    prioritySum: { type: 'integer', nullable: true },
    completedCount: { type: 'integer', nullable: true },
    abandonedCount: { type: 'integer', nullable: true },
    skippedCount: { type: 'integer', nullable: true },
    isDayOff: { type: 'boolean', nullable: true },
  },
};

export const statsResponse = {
  type: 'object',
  properties: {
    currentStreak: { type: 'integer' },
    weeklyVelocity: { type: 'number' },
    efficiency: { type: 'number' },
    history: { type: 'array', items: userStatRecord },
    heatmapData: { type: 'array', items: userStatRecord },
    velocityData: { type: 'array', items: userStatRecord },
  },
};
