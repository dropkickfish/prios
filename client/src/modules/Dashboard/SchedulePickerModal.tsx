import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { CardType } from '../../types';

interface SchedulePickerModalProps {
  card: CardType;
  onClose: () => void;
  onScheduled: (scheduledAt: string) => void;
}

interface Suggestion {
  startTime: string;
  endTime: string;
  label: string;
}

export const SchedulePickerModal: React.FC<SchedulePickerModalProps> = ({ card, onClose, onScheduled }) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(card.difficulty * 30);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await apiClient.getScheduleSuggestions(card.id);
        setSuggestions(data.suggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [card.id]);

  const handleSchedule = async (startTime: string) => {
    setScheduling(true);
    try {
      const res = await apiClient.scheduleCard(card.id, { 
        scheduledAt: startTime,
        durationMinutes: duration 
      });
      if (res.success) {
        onScheduled(res.scheduledAt);
      }
    } catch (error) {
      console.error('Failed to schedule:', error);
      alert('Failed to schedule. Check console.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box bg-slate-900 border border-slate-700 shadow-2xl max-w-md">
        <h3 className="font-bold text-xl text-white mb-2">Schedule Task</h3>
        <p className="text-slate-400 mb-6">"{card.title}"</p>

        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text text-slate-300">Duration (minutes)</span>
          </label>
          <input 
            type="number" 
            className="input input-bordered bg-slate-800 text-white border-slate-700" 
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
          />
          <label className="label">
             <span className="label-text-alt text-slate-500">Based on difficulty: {card.difficulty}</span>
          </label>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Suggested Slots</span>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-center p-4 text-slate-500 italic">No free slots found in the next 48 hours.</p>
          ) : (
            suggestions.map((slot, i) => (
              <button
                key={i}
                disabled={scheduling}
                onClick={() => handleSchedule(slot.startTime)}
                className="w-full flex items-center justify-between p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group"
              >
                <div className="text-left">
                  <div className="font-bold text-white group-hover:text-primary transition-colors">{slot.label}</div>
                  <div className="text-xs text-slate-500">Duration: {duration} mins</div>
                </div>
                <div className="badge badge-primary badge-outline opacity-0 group-hover:opacity-100 transition-opacity">
                  Select
                </div>
              </button>
            ))
          )}
        </div>

        <div className="modal-action mt-8">
          <button className="btn btn-ghost text-slate-400" onClick={onClose} disabled={scheduling}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
