/** LocalStorage keys and helpers for "blend into focus after X in triage" */

export const TRIAGE_AUTO_FOCUS_KEY = 'prios.triageAutoFocusEnabled';
export const TRIAGE_AUTO_FOCUS_MINUTES_KEY = 'prios.triageAutoFocusMinutes';
const DEFAULT_MINUTES = 2;

export function getTriageAutoFocusEnabled(): boolean {
  try {
    return localStorage.getItem(TRIAGE_AUTO_FOCUS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setTriageAutoFocusEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(TRIAGE_AUTO_FOCUS_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function getTriageAutoFocusMinutes(): number {
  try {
    const m = Number(localStorage.getItem(TRIAGE_AUTO_FOCUS_MINUTES_KEY));
    return Number.isFinite(m) && m >= 1 && m <= 60 ? m : DEFAULT_MINUTES;
  } catch {
    return DEFAULT_MINUTES;
  }
}

export function setTriageAutoFocusMinutes(minutes: number): void {
  const value = Math.min(60, Math.max(1, Math.round(minutes)));
  try {
    localStorage.setItem(TRIAGE_AUTO_FOCUS_MINUTES_KEY, String(value));
  } catch {
    // ignore
  }
}

export const DEFAULT_TRIAGE_AUTO_FOCUS_MINUTES = DEFAULT_MINUTES;
