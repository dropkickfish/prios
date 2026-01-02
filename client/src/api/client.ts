import type { CardType } from '../types';

const API_BASE = 'http://localhost:3000/api';

export const apiClient = {
  getBoards: async () => {
    const res = await fetch(`${API_BASE}/boards`);
    return res.json();
  },
  createBoard: async (data: { name: string; availabilitySchedule: any }) => {
    const res = await fetch(`${API_BASE}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
    return res.json();
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
  getScheduleSuggestions: async (cardId: string): Promise<{ suggestions: Array<{ startTime: string; endTime: string; label: string }>; currentDifficulty: number }> => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/schedule-suggestions`);
    return res.json();
  },
  addDependency: async (blockingCardId: string, blockedCardId: string) => {
    const res = await fetch(`${API_BASE}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockingCardId, blockedCardId }),
    });
    return res.json();
  }
};
