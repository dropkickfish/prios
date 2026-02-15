import { useState, useEffect } from 'react';
import {
  getTriageAutoFocusEnabled,
  setTriageAutoFocusEnabled,
  getTriageAutoFocusMinutes,
  setTriageAutoFocusMinutes,
  DEFAULT_TRIAGE_AUTO_FOCUS_MINUTES,
} from '../../settings/triageSettings';

export const TriageSettings = () => {
  const [enabled, setEnabled] = useState(false);
  const [minutes, setMinutes] = useState(DEFAULT_TRIAGE_AUTO_FOCUS_MINUTES);

  useEffect(() => {
    setEnabled(getTriageAutoFocusEnabled());
    setMinutes(getTriageAutoFocusMinutes());
  }, []);

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    setTriageAutoFocusEnabled(value);
  };

  const handleMinutesChange = (value: number) => {
    const clamped = Math.min(60, Math.max(1, value));
    setMinutes(clamped);
    setTriageAutoFocusMinutes(clamped);
  };

  return (
    <section className="card bg-base-100 shadow-xl border border-base-200 p-8">
      <h2 className="text-xl font-black mb-6 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Triage
      </h2>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold">Enter focus mode after time in triage</p>
            <p className="text-sm opacity-50">When on, staying in Triage without acting will automatically switch to Focus mode after the delay below.</p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
        </div>

        {enabled && (
          <div className="flex items-center justify-between gap-4 pl-2 border-l-2 border-primary/20">
            <label htmlFor="triage-auto-focus-minutes" className="font-bold">After (minutes)</label>
            <div className="flex items-center gap-2">
              <input
                id="triage-auto-focus-minutes"
                type="number"
                min={1}
                max={60}
                value={minutes}
                onChange={(e) => handleMinutesChange(Number(e.target.value))}
                className="input input-bordered input-sm w-20 text-center"
              />
              <span className="text-sm opacity-60">min</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
