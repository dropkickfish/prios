import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stats } from '../modules/Stats/Stats';

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    getStats: vi.fn(),
  },
}));

const { apiClient } = await import('../api/client');

describe('Stats', () => {
  beforeEach(() => {
    vi.mocked(apiClient.getStats).mockReset();
  });

  it('shows loading state initially', () => {
    vi.mocked(apiClient.getStats).mockImplementation(() => new Promise(() => {}));
    render(<Stats />);
    expect(document.querySelector('.loading')).toBeInTheDocument();
  });

  it('renders streak, velocity, and efficiency when stats load', async () => {
    vi.mocked(apiClient.getStats).mockResolvedValue({
      currentStreak: 5,
      weeklyVelocity: 2.3,
      efficiency: 85,
      history: [
        { date: '2026-02-14', completedCount: 2, abandonedCount: 0, skippedCount: 1 },
        { date: '2026-02-13', completedCount: 3, abandonedCount: 1, skippedCount: 0 },
      ],
    });
    render(<Stats />);
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(await screen.findByText('2.3')).toBeInTheDocument();
    expect(await screen.findByText('85%')).toBeInTheDocument();
    expect(await screen.findByText('Your Momentum')).toBeInTheDocument();
  });

  it('shows activity history when present', async () => {
    vi.mocked(apiClient.getStats).mockResolvedValue({
      currentStreak: 0,
      weeklyVelocity: 0,
      efficiency: 0,
      history: [{ date: '2026-02-14', completedCount: 1, abandonedCount: 0, skippedCount: 0 }],
    });
    render(<Stats />);
    await screen.findByText('Your Momentum');
    expect(screen.getByText('2026-02-14')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
