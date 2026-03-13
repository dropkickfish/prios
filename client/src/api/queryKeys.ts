export const queryKeys = {
  boards: () => ['boards'] as const,
  board: (boardId: string) => ['boards', boardId] as const,
  statuses: (boardId: string) => ['statuses', boardId] as const,
  cards: (boardId: string) => ['cards', boardId] as const,
  card: (cardId: string) => ['card', cardId] as const,
  cardDependencies: (cardId: string) => ['card', cardId, 'dependencies'] as const,
  cardUpdates: (cardId: string) => ['card', cardId, 'updates'] as const,
  tags: (boardId?: string) => boardId ? ['tags', boardId] as const : ['tags'] as const,
  stats: () => ['stats'] as const,
  googleAuthStatus: () => ['auth', 'google'] as const,
  calendarAvailability: () => ['calendar', 'availability'] as const,
};
