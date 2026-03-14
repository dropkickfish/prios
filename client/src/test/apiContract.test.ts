// @vitest-environment node
/**
 * API contract tests. Run with server on http://localhost:3000 (e.g. npm run dev in server).
 * Skips all tests if server is unreachable.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = 'http://0.0.0.0:3000';
let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
});

describe('API contract (server must be running)', () => {
  it('GET /health returns { status: "ok" }', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    expect(data).toEqual({ status: 'ok' });
  });

  it('GET /api/stats returns currentStreak, weeklyVelocity, efficiency, history', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${API_BASE}/api/stats`);
    const data = await res.json();
    expect(data).toHaveProperty('currentStreak');
    expect(data).toHaveProperty('weeklyVelocity');
    expect(data).toHaveProperty('efficiency');
    expect(Array.isArray(data.history)).toBe(true);
  });

  it('GET /api/boards returns array; cards include statusCategory when board has cards', async () => {
    if (!serverAvailable) return;
    const boardsRes = await fetch(`${API_BASE}/api/boards`);
    const boards = await boardsRes.json();
    expect(Array.isArray(boards)).toBe(true);
    if (boards.length > 0) {
      const cardsRes = await fetch(`${API_BASE}/api/boards/${boards[0].id}/cards`);
      const cards = await cardsRes.json();
      expect(Array.isArray(cards)).toBe(true);
      if (cards.length > 0) {
        expect(cards[0]).toHaveProperty('statusCategory');
        expect(['maybe', 'scheduled', 'doing', 'done', 'wontdo'].includes(cards[0].statusCategory)).toBe(true);
      }
    }
  });
});

describe('Attachments API (server must be running)', () => {
  // Holds a card ID created for attachment tests, cleaned up after
  let testCardId: string | null = null;

  beforeAll(async () => {
    if (!serverAvailable) return;
    // Create a throwaway card to attach files to
    const boardsRes = await fetch(`${API_BASE}/api/boards`);
    const boards = await boardsRes.json();
    if (!boards.length) return;

    const board = boards[0];
    const statusesRes = await fetch(`${API_BASE}/api/boards/${board.id}/statuses`);
    const statuses = await statusesRes.json();
    const backlogStatus = statuses.find((s: any) => s.category === 'maybe');
    if (!backlogStatus) return;

    const cardRes = await fetch(`${API_BASE}/api/boards/${board.id}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusId: backlogStatus.id, title: 'Attachment test card', difficulty: 1, priority: 1 }),
    });
    if (cardRes.ok) {
      const card = await cardRes.json();
      testCardId = card.id;
    }
  });

  afterAll(async () => {
    if (!serverAvailable || !testCardId) return;
    await fetch(`${API_BASE}/api/cards/${testCardId}`, { method: 'DELETE' });
  });

  it('GET /api/cards/:cardId/attachments returns empty array for new card', async () => {
    if (!serverAvailable || !testCardId) return;
    const res = await fetch(`${API_BASE}/api/cards/${testCardId}/attachments`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it('POST /api/cards/:cardId/attachments uploads a file and returns attachment shape', async () => {
    if (!serverAvailable || !testCardId) return;
    const form = new FormData();
    form.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');

    const res = await fetch(`${API_BASE}/api/cards/${testCardId}/attachments`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(201);
    const attachment = await res.json();
    expect(attachment).toHaveProperty('id');
    expect(attachment).toHaveProperty('cardId', testCardId);
    expect(attachment).toHaveProperty('filename', 'test.txt');
    expect(attachment).toHaveProperty('mimeType', 'text/plain');
    expect(attachment).toHaveProperty('size', 12);
    expect(attachment).toHaveProperty('url');
    expect(typeof attachment.url).toBe('string');
  });

  it('GET /api/cards/:cardId/attachments lists uploaded attachment', async () => {
    if (!serverAvailable || !testCardId) return;
    const res = await fetch(`${API_BASE}/api/cards/${testCardId}/attachments`);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('url');
    expect(data[0]).toHaveProperty('filename');
  });

  it('DELETE /api/attachments/:id removes the attachment', async () => {
    if (!serverAvailable || !testCardId) return;
    // Upload one to delete
    const form = new FormData();
    form.append('file', new Blob(['delete me'], { type: 'text/plain' }), 'todelete.txt');
    const uploadRes = await fetch(`${API_BASE}/api/cards/${testCardId}/attachments`, {
      method: 'POST', body: form,
    });
    const attachment = await uploadRes.json();

    const deleteRes = await fetch(`${API_BASE}/api/attachments/${attachment.id}`, { method: 'DELETE' });
    expect(deleteRes.status).toBe(204);

    // Confirm it's gone
    const listRes = await fetch(`${API_BASE}/api/cards/${testCardId}/attachments`);
    const remaining = await listRes.json();
    expect(remaining.every((a: any) => a.id !== attachment.id)).toBe(true);
  });

  it('DELETE /api/attachments/:id returns 404 for unknown id', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${API_BASE}/api/attachments/does-not-exist`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('GET /api/cards/:cardId/attachments returns 404 for unknown card', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${API_BASE}/api/cards/does-not-exist/attachments`);
    expect(res.status).toBe(404);
  });

  it('POST /api/admin/sweep returns { deleted: number }', async () => {
    if (!serverAvailable) return;
    const res = await fetch(`${API_BASE}/api/admin/sweep`, { method: 'POST' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('deleted');
    expect(typeof data.deleted).toBe('number');
  });
});
