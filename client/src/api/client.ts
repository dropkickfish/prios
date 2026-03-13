import type { CardType } from '../types';

/** Use relative path so dev proxy and production same-origin both work. */
const API_BASE = '/api';

export const apiClient = {
  getBoards: async () => {
    const res = await fetch(`${API_BASE}/boards`);
    return res.json();
  },
  createBoard: async (data: { name: string; availabilitySchedule: unknown }) => {
    const res = await fetch(`${API_BASE}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateBoard: async (boardId: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update board');
    return res.json();
  },
  deleteBoard: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete board');
    return res.json();
  },
  reorderBoards: async (boards: { id: string; order: number }[]) => {
    const res = await fetch(`${API_BASE}/boards/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boards }),
    });
    return res.json();
  },
  getStatuses: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/statuses`);
    return res.json();
  },
  getCards: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`);
    return res.json();
  },
  getCard: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`);
    return res.json();
  },
  getActiveCard: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`);
    const cards = await res.json();
    // In a real app, we'd have a specialized endpoint or server-side filter
    // For now, we'll filter client-side for simplicity as per MVP
    return cards.find((c: any) => c.statusCategory === 'doing') || null;
  },
  updateCard: async (cardId: string, updates: Partial<CardType>) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to update card');
    return data;
  },
  deleteCard: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  getStats: async () => {
    const res = await fetch(`${API_BASE}/stats`);
    return res.json();
  },
  recordAbandon: async () => {
    const res = await fetch(`${API_BASE}/stats/abandon`, { method: 'POST' });
    return res.json();
  },
  resetStats: async () => {
    const res = await fetch(`${API_BASE}/stats`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to reset stats');
    return res.json();
  },
  resetStatsForDate: async (date: string) => {
    const res = await fetch(`${API_BASE}/stats/${date}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to reset stats for date');
    return res.json();
  },
  createCard: async (boardId: string, card: Partial<CardType>) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create card');
    }
    return res.json();
  },
  getGoogleAuthUrl: async () => {
    const res = await fetch(`${API_BASE}/auth/google/url`);
    return res.json();
  },
  getGoogleAuthStatus: async () => {
    const res = await fetch(`${API_BASE}/auth/google/status`);
    return res.json();
  },
  disconnectGoogle: async () => {
    const res = await fetch(`${API_BASE}/auth/google`, { method: 'DELETE' });
    return res.json();
  },
  getCalendarAvailability: async () => {
    const res = await fetch(`${API_BASE}/calendar/availability`);
    return res.json();
  },
  autoSchedule: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/scheduler/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId }),
    });
    return res.json();
  },
  scheduleCard: async (cardId: string, data?: { scheduledAt?: string; durationMinutes?: number }): Promise<{ success: boolean; scheduledAt: string }> => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return res.json();
  },
  getScheduleSuggestions: async (cardId: string, date?: string): Promise<{ suggestions: Array<{ startTime: string; endTime: string; label: string }>; currentDifficulty: number }> => {
    const url = new URL(`${API_BASE}/cards/${cardId}/schedule-suggestions`);
    if (date) url.searchParams.append('date', date);
    const res = await fetch(url.toString());
    return res.json();
  },
  addDependency: async (blockingCardId: string, blockedCardId: string) => {
    const res = await fetch(`${API_BASE}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockingCardId, blockedCardId }),
    });
    return res.json();
  },
  getCardDependencies: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/dependencies`);
    return res.json();
  },
  deleteDependency: async (dependencyId: string) => {
    const res = await fetch(`${API_BASE}/dependencies/${dependencyId}`, {
      method: 'DELETE'
    });
    return res.json();
  },
  getCardUpdates: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/updates`);
    return res.json();
  },
  addCardUpdate: async (cardId: string, content: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return res.json();
  },
  syncCalendar: async () => {
    const res = await fetch(`${API_BASE}/calendar/sync`, { method: 'POST' });
    return res.json();
  },
  getTags: async (boardId?: string): Promise<any[]> => {
    const url = new URL(`${API_BASE}/tags`);
    if (boardId) url.searchParams.append('boardId', boardId);
    const res = await fetch(url.toString());
    return res.json();
  },
  createTag: async (data: { name: string; boardId: string; colour?: string }) => {
    const res = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  addCardTag: async (cardId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    });
    return res.json();
  },
  deleteCardTag: async (cardId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/tags/${tagId}`, {
      method: 'DELETE',
    });
    return res.json();
  }
};
