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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
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
    <div className="modal modal-open z-[100]">
      <div className="modal-box bg-base-100 border border-base-content/10 shadow-2xl max-w-lg rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-black text-primary mb-2">Schedule Task</h3>
        <p className="text-xs uppercase font-black tracking-widest opacity-40 mb-8 leading-tight">"{card.title}"</p>
        <div className="space-y-2 mb-8">
          <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Duration (Minutes)</label>
          <input 
            type="number" 
            className="input w-full bg-base-content/5 border border-base-content/10 focus:border-primary/50 focus:bg-base-content/10 rounded-2xl h-14 text-xl font-black px-6 transition-all"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
          />
          <div className="text-[10px] uppercase font-black tracking-widest opacity-30 mt-1">Based on difficulty: {card.difficulty}</div>
        </div>

        <div className="space-y-4">
          <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px] block mb-2">Suggested Slots</span>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {loading ? (
              <div className="flex justify-center p-8">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-center p-6 bg-base-200/30 rounded-2xl text-[10px] opacity-40 italic">No free slots found in the next 48 hours.</p>
            ) : (
              suggestions.map((slot, i) => (
                <button
                  key={i}
                  disabled={scheduling}
                  onClick={() => handleSchedule(slot.startTime)}
                  className="w-full flex items-center justify-between p-5 bg-base-200/30 hover:bg-primary/5 border border-base-content/5 hover:border-primary/20 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <div className="font-black text-base-content group-hover:text-primary transition-colors">{slot.label}</div>
                    <div className="text-[10px] uppercase font-black tracking-widest opacity-30 mt-1">Duration: {duration} mins</div>
                  </div>
                  <div className="badge badge-primary badge-sm font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Pick
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="modal-action mt-10">
          <button className="btn btn-ghost text-base-content/50 hover:text-base-content hover:bg-base-content/10 rounded-2xl" onClick={onClose} disabled={scheduling}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
