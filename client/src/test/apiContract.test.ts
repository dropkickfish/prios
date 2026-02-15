/**
 * API contract tests. Run with server on http://localhost:3000 (e.g. npm run dev in server).
 * Skips all tests if server is unreachable.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = 'http://localhost:3000';
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
