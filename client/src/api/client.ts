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
};
