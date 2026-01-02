import React, { useState } from 'react';

import type { BoardType } from '../../types';

interface BoardSettingsModalProps {
  board: BoardType;
  onClose: () => void;
  onUpdated: (board: BoardType) => void;
}

const THEME_COLOURS = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Tailwind Safelist for dynamic classes:
// bg-primary bg-secondary bg-accent bg-neutral bg-info bg-success bg-warning bg-error
// text-primary text-secondary text-accent text-neutral text-info text-success text-warning text-error
// border-primary border-secondary border-accent border-neutral border-info border-success border-warning border-error


export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({ board, onClose, onUpdated }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'schedule'>('general');
  const [loading, setLoading] = useState(false);
  
  // General State
  const [name, setName] = useState(board.name);
  
  // Appearance State
  const [colour, setColour] = useState(board.colour || 'primary');

  // Schedule State
  const [schedule, setSchedule] = useState<any>(board.availabilitySchedule || {});

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colour, availabilitySchedule: schedule }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdated(updated);
        onClose();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update board');
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (day: string, type: 'start' | 'end', val: string) => {
    const currentDaySchedule = schedule[day] && schedule[day][0] ? schedule[day][0] : '09:00-17:00';
    const [start, end] = currentDaySchedule.split('-');
    
    let newRange;
    if (type === 'start') newRange = `${val}-${end}`;
    else newRange = `${start}-${val}`;

    setSchedule({
      ...schedule,
      [day]: [newRange]
    });
  };

  const toggleDay = (day: string) => {
    if (schedule[day] && schedule[day].length > 0) {
      const newSchedule = { ...schedule };
      delete newSchedule[day];
      setSchedule(newSchedule);
    } else {
      setSchedule({
        ...schedule,
        [day]: ['09:00-17:00']
      });
    }
  };

  return (
    <div className="modal modal-open bg-base-300/60 backdrop-blur-sm">
      <div className="modal-box max-w-2xl border border-base-content/10 shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-0">
          <h3 className="text-3xl font-black text-base-content tracking-tight">Board Settings</h3>
          <div className="tabs tabs-boxed bg-base-200 mt-6 p-1 rounded-2xl">
            {(['general', 'appearance', 'schedule'] as const).map(tab => (
              <a 
                key={tab}
                className={`tab tab-lg rounded-xl font-bold flex-1 uppercase tracking-wider text-xs ${activeTab === tab ? 'tab-active bg-base-100 shadow-sm text-base-content' : 'text-base-content/60 hover:bg-base-content/5'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </a>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          <form id="settings-form" onSubmit={handleSave} className="space-y-6">
            
            {activeTab === 'general' && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-black uppercase tracking-widest text-base-content/60 text-[10px]">Board Name</span>
                </label>
                <input 
                  type="text" 
                  className="input input-bordered focus:input-primary rounded-2xl h-14 text-lg font-bold bg-base-200/50 text-base-content"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-8">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-black uppercase tracking-widest text-base-content/60 text-[10px]">Accent Colour</span>
                  </label>
                  <div className="grid grid-cols-4 gap-4">
                    {THEME_COLOURS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColour(c)}
                        className={`btn h-20 rounded-2xl border-2 flex flex-col gap-2 relative overflow-hidden group hover:scale-105 transition-all
                           ${colour === c ? 'border-base-content/20 bg-base-100' : 'border-transparent bg-base-200/50'}`}
                      >
                         <div className={`w-full h-full absolute inset-0 opacity-10 bg-${c}`}></div>
                         <div className={`w-8 h-8 rounded-full bg-${c} shadow-sm z-10 scale-100 transition-transform group-hover:scale-110`}></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-base-content/70 z-10">{c}</span>
                         {colour === c && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-success shadow-lg shadow-success/50"></div>
                         )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <div className="alert bg-base-200/50 border-none rounded-2xl">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   <span className="text-xs font-medium text-base-content/80">
                     Define when tasks on this board can be scheduled. Tasks will only be auto-scheduled within these windows.
                   </span>
                </div>

                <div className="space-y-2">
                  {DAYS.map(day => {
                    const isActive = schedule[day] && schedule[day].length > 0;
                    const value = isActive ? schedule[day][0] : '09:00-17:00';
                    const [start, end] = value.split('-');

                    return (
                      <div key={day} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isActive ? 'bg-base-100 border-base-content/10' : 'bg-base-200/30 border-transparent opacity-60'}`}>
                        <div className="form-control">
                          <label className="label cursor-pointer gap-3">
                            <input type="checkbox" className="checkbox checkbox-primary rounded-lg" checked={isActive} onChange={() => toggleDay(day)} />
                            <span className="label-text font-black uppercase tracking-widest text-xs w-8 text-base-content">{day}</span>
                          </label>
                        </div>
                        
                        {isActive && (
                          <div className="flex items-center gap-2 flex-1">
                             <input 
                               type="time" 
                               value={start} 
                               onChange={(e) => updateSchedule(day, 'start', e.target.value)}
                               className="input input-sm bg-base-200 font-bold rounded-xl flex-1 text-center focus:input-primary text-base-content"
                             />
                             <span className="opacity-40 font-black text-base-content">/</span>
                             <input 
                               type="time" 
                               value={end} 
                               onChange={(e) => updateSchedule(day, 'end', e.target.value)}
                               className="input input-sm bg-base-200 font-bold rounded-xl flex-1 text-center focus:input-primary text-base-content"
                             />
                          </div>
                        )}
                        {!isActive && <div className="text-[10px] font-black uppercase tracking-widest opacity-40 flex-1 text-center text-base-content">Day Off</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-base-200/50 flex justify-end gap-3 border-t border-base-content/5">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-2xl h-12 px-6 text-base-content/70 hover:text-base-content hover:bg-base-200">Cancel</button>
            <button 
              type="submit" 
              form="settings-form"
              className={`btn btn-primary px-8 rounded-2xl h-12 shadow-lg shadow-primary/20 border-none text-white font-black tracking-wide ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              Save Settings
            </button>
        </div>
      </div>
    </div>
  );
};
