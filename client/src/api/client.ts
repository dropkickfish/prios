import type { CardType, TagType, AttachmentType } from '../types';

/** Use relative path so dev proxy and production same-origin both work. */
const API_BASE = '/api';

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

function getHeaders(includeContentType = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  return headers;
}

async function throwIfNotOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res;
}

export const apiClient = {
  getBoards: async () => {
    const res = await fetch(`${API_BASE}/boards`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  createBoard: async (data: { name: string; availabilitySchedule: unknown }) => {
    const res = await fetch(`${API_BASE}/boards`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return (await throwIfNotOk(res)).json();
  },
  updateBoard: async (boardId: string, data: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return (await throwIfNotOk(res)).json();
  },
  deleteBoard: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}`, { method: 'DELETE', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  reorderBoards: async (boards: { id: string; order: number }[]) => {
    const res = await fetch(`${API_BASE}/boards/reorder`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ boards }),
    });
    return (await throwIfNotOk(res)).json();
  },
  getStatuses: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/statuses`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  getCards: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  getCard: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  updateCard: async (cardId: string, updates: Partial<CardType>) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify(updates),
    });
    return (await throwIfNotOk(res)).json();
  },
  deleteCard: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return (await throwIfNotOk(res)).json();
  },
  getStats: async () => {
    const res = await fetch(`${API_BASE}/stats`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  recordAbandon: async () => {
    const res = await fetch(`${API_BASE}/stats/abandon`, { method: 'POST', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  resetStats: async () => {
    const res = await fetch(`${API_BASE}/stats`, { method: 'DELETE', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  resetStatsForDate: async (date: string) => {
    const res = await fetch(`${API_BASE}/stats/${date}`, { method: 'DELETE', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  createCard: async (boardId: string, card: Partial<CardType>) => {
    const res = await fetch(`${API_BASE}/boards/${boardId}/cards`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(card),
    });
    return (await throwIfNotOk(res)).json();
  },
  getGoogleAuthUrl: async () => {
    const res = await fetch(`${API_BASE}/auth/google/url`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  getGoogleAuthStatus: async () => {
    const res = await fetch(`${API_BASE}/auth/google/status`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  disconnectGoogle: async () => {
    const res = await fetch(`${API_BASE}/auth/google`, { method: 'DELETE', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  getCalendarAvailability: async () => {
    const res = await fetch(`${API_BASE}/calendar/availability`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  autoSchedule: async (boardId: string) => {
    const res = await fetch(`${API_BASE}/scheduler/auto`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ boardId }),
    });
    return (await throwIfNotOk(res)).json();
  },
  scheduleCard: async (cardId: string, data?: { scheduledAt?: string; durationMinutes?: number }): Promise<{ success: boolean; scheduledAt: string }> => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/schedule`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data || {}),
    });
    return (await throwIfNotOk(res)).json();
  },
  getScheduleSuggestions: async (cardId: string, date?: string): Promise<{ suggestions: Array<{ startTime: string; endTime: string; label: string }>; currentDifficulty: number }> => {
    const url = new URL(`${API_BASE}/cards/${cardId}/schedule-suggestions`);
    if (date) url.searchParams.append('date', date);
    const res = await fetch(url.toString(), { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  addDependency: async (blockingCardId: string, blockedCardId: string) => {
    const res = await fetch(`${API_BASE}/dependencies`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ blockingCardId, blockedCardId }),
    });
    return (await throwIfNotOk(res)).json();
  },
  getCardDependencies: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/dependencies`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  deleteDependency: async (dependencyId: string) => {
    const res = await fetch(`${API_BASE}/dependencies/${dependencyId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return (await throwIfNotOk(res)).json();
  },
  getCardUpdates: async (cardId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/updates`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  addCardUpdate: async (cardId: string, content: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/updates`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ content }),
    });
    return (await throwIfNotOk(res)).json();
  },
  syncCalendar: async () => {
    const res = await fetch(`${API_BASE}/calendar/sync`, { method: 'POST', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  getTags: async (boardId?: string): Promise<TagType[]> => {
    const url = new URL(`${API_BASE}/tags`);
    if (boardId) url.searchParams.append('boardId', boardId);
    const res = await fetch(url.toString(), { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  createTag: async (data: { name: string; boardId: string; colour?: string }) => {
    const res = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return (await throwIfNotOk(res)).json();
  },
  addCardTag: async (cardId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/tags`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ tagId }),
    });
    return (await throwIfNotOk(res)).json();
  },
  deleteCardTag: async (cardId: string, tagId: string) => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/tags/${tagId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return (await throwIfNotOk(res)).json();
  },
  getAttachments: async (cardId: string): Promise<AttachmentType[]> => {
    const res = await fetch(`${API_BASE}/cards/${cardId}/attachments`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  uploadAttachment: async (cardId: string, file: File): Promise<AttachmentType> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/cards/${cardId}/attachments`, {
      method: 'POST',
      headers: getHeaders(false), // no Content-Type — browser sets multipart/form-data boundary
      body: form,
    });
    return (await throwIfNotOk(res)).json();
  },
  deleteAttachment: async (attachmentId: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/attachments/${attachmentId}`, { method: 'DELETE', headers: getHeaders() });
    await throwIfNotOk(res);
  },
  getApiKeyStatus: async (): Promise<{ configured: boolean; preview: string | null; source: 'env' | 'db' | 'none' }> => {
    const res = await fetch(`${API_BASE}/settings/api-key`, { headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  rotateApiKey: async (): Promise<{ key: string }> => {
    const res = await fetch(`${API_BASE}/settings/api-key/rotate`, { method: 'POST', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
  deleteApiKey: async (): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/settings/api-key`, { method: 'DELETE', headers: getHeaders() });
    return (await throwIfNotOk(res)).json();
  },
};
