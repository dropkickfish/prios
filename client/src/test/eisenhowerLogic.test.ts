import { describe, it, expect } from 'vitest';
import { computeEisenhowerResult } from '../modules/Dashboard/eisenhowerLogic';

describe('computeEisenhowerResult', () => {
  it('gives priority 1 when important and urgent', () => {
    expect(computeEisenhowerResult({
      important: true,
      urgent: true,
      complex: 1,
      time: 1,
    })).toEqual({ priority: 1, difficulty: 2 });
  });

  it('gives priority 2 when important but not urgent', () => {
    expect(computeEisenhowerResult({
      important: true,
      urgent: false,
      complex: 2,
      time: 1,
    })).toEqual({ priority: 2, difficulty: 3 });
  });

  it('gives priority 3 when urgent but not important', () => {
    expect(computeEisenhowerResult({
      important: false,
      urgent: true,
      complex: 1,
      time: 2,
    })).toEqual({ priority: 3, difficulty: 3 });
  });

  it('gives priority 4 when neither important nor urgent', () => {
    expect(computeEisenhowerResult({
      important: false,
      urgent: false,
      complex: 3,
      time: 2,
    })).toEqual({ priority: 4, difficulty: 5 });
  });

  it('caps difficulty at 5', () => {
    expect(computeEisenhowerResult({
      important: true,
      urgent: true,
      complex: 3,
      time: 2,
    })).toEqual({ priority: 1, difficulty: 5 });
  });
});
