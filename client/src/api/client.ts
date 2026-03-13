import type { CardType, TagType } from '../types';

/** Use relative path so dev proxy and production same-origin both work. */
const API_BASE = '/api';

async function throwIfNotOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res;
}

export const apiClient = {
  getBoards: async () => {
    const res = await fetch(`${API_BASE}/boards`);
    return (await throwIfNotOk(res)).json();
  },
  createBoard: async (data: { name: string; availabilitySchedule: unknown }) => {
    const res = await fetch(`${API_BASE}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await throwIfNotOk(res)).json();
  },
  updateBoard: async (boardId: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await throwIfNotOk(res)).json();
  },
  deleteBoard: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}`, { method: 'DELETE' });
    return (await throwIfNotOk(res)).json();
  },
  reorderBoards: async (boards: { id: string; order: number }[]) => {
    const res = await fetch(`${API_BASE}/boards/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boards }),
    });
    return (await throwIfNotOk(res)).json();
  },
  getStatuses: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/statuses`);
    return (await throwIfNotOk(res)).json();
  },
  getCards: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`);
    return (await throwIfNotOk(res)).json();
  },
  getCard: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`);
    return (await throwIfNotOk(res)).json();
  },
  updateCard: async (cardId: string, updates: Partial<CardType>) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return (await throwIfNotOk(res)).json();
  },
  deleteCard: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'DELETE',
    });
    return (await throwIfNotOk(res)).json();
  },
  getStats: async () => {
    const res = await fetch(`${API_BASE}/stats`);
    return (await throwIfNotOk(res)).json();
  },
  recordAbandon: async () => {
    const res = await fetch(`${API_BASE}/stats/abandon`, { method: 'POST' });
    return (await throwIfNotOk(res)).json();
  },
  resetStats: async () => {
    const res = await fetch(`${API_BASE}/stats`, { method: 'DELETE' });
    return (await throwIfNotOk(res)).json();
  },
  resetStatsForDate: async (date: string) => {
    const res = await fetch(`${API_BASE}/stats/${date}`, { method: 'DELETE' });
    return (await throwIfNotOk(res)).json();
  },
  createCard: async (boardId: string, card: Partial<CardType>) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    return (await throwIfNotOk(res)).json();
  },
  getGoogleAuthUrl: async () => {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    return (await throwIfNotOk(res)).json();
  },
  getGoogleAuthStatus: async () => {
    const res = await fetch(`${API_BASE}/auth/google/status`);
    return (await throwIfNotOk(res)).json();
  },
  disconnectGoogle: async () => {
    const res = await fetch(`${API_BASE}/auth/google`, { method: 'DELETE' });
    return (await throwIfNotOk(res)).json();
  },
  getCalendarAvailability: async () => {
    const res = await fetch(`${API_BASE}/calendar/availability`);
    return (await throwIfNotOk(res)).json();
  },
  autoSchedule: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/scheduler/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId }),
    });
    return (await throwIfNotOk(res)).json();
  },
  scheduleCard: async (cardId: string, data?: { scheduledAt?: string; durationMinutes?: number }): Promise<{ success: boolean; scheduledAt: string }> => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return (await throwIfNotOk(res)).json();
  },
  getScheduleSuggestions: async (cardId: string, date?: string): Promise<{ suggestions: Array<{ startTime: string; endTime: string; label: string }>; currentDifficulty: number }> => {
    const url = new URL(`${API_BASE}/cards/${cardId}/schedule-suggestions`);
    if (date) url.searchParams.append('date', date);
    const res = await fetch(url.toString());
    return (await throwIfNotOk(res)).json();
  },
  addDependency: async (blockingCardId: string, blockedCardId: string) => {
    const res = await fetch(`${API_BASE}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockingCardId, blockedCardId }),
    });
    return (await throwIfNotOk(res)).json();
  },
  getCardDependencies: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/dependencies`);
    return (await throwIfNotOk(res)).json();
  },
  deleteDependency: async (dependencyId: string) => {
    const res = await fetch(`${API_BASE}/dependencies/${dependencyId}`, {
      method: 'DELETE'
    });
    return (await throwIfNotOk(res)).json();
  },
  getCardUpdates: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/updates`);
    return (await throwIfNotOk(res)).json();
  },
  addCardUpdate: async (cardId: string, content: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return (await throwIfNotOk(res)).json();
  },
  syncCalendar: async () => {
    const res = await fetch(`${API_BASE}/calendar/sync`, { method: 'POST' });
    return (await throwIfNotOk(res)).json();
  },
  getTags: async (boardId?: string): Promise<TagType[]> => {
    const url = new URL(`${API_BASE}/tags`);
    if (boardId) url.searchParams.append('boardId', boardId);
    const res = await fetch(url.toString());
    return (await throwIfNotOk(res)).json();
  },
  createTag: async (data: { name: string; boardId: string; colour?: string }) => {
    const res = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await throwIfNotOk(res)).json();
  },
  addCardTag: async (cardId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    });
    return (await throwIfNotOk(res)).json();
  },
  deleteCardTag: async (cardId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/tags/${tagId}`, {
      method: 'DELETE',
    });
    return (await throwIfNotOk(res)).json();
  }
};
