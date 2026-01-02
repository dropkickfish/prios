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
  getActiveCard: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`);
    const cards = await res.json();
    // In a real app, we'd have a specialized endpoint or server-side filter
    // For now, we'll filter client-side for simplicity as per MVP
    return cards.find((c: any) => c.statusCategory === 'doing') || null;
  },
  updateCardStatus: async (cardId: string, statusId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusId }),
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
  }
};
