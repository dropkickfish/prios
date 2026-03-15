import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { BoardType } from '../../types';

interface BoardSettingsModalProps {
  board: BoardType;
  onClose: () => void;
  onUpdated: (board: BoardType) => void;
  onDeleted?: () => void;
}

const THEME_COLOURS = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({ board, onClose, onUpdated, onDeleted }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'prioritisation' | 'danger'>('general');
  const [loading, setLoading] = useState(false);
  
  // General State
  const [name, setName] = useState(board.name);
  const [colour, setColour] = useState(board.colour || 'primary');

  // Schedule State
  const [schedule, setSchedule] = useState<any>(board.availabilitySchedule || {});
  const [schedulingWindowDays, setSchedulingWindowDays] = useState(board.schedulingWindowDays || 3);

  // Danger Zone
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await apiClient.updateBoard(board.id, {
        name,
        colour,
        availabilitySchedule: schedule,
        schedulingWindowDays,
      });
      onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update board');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (deleteConfirm !== board.name) return;
    setLoading(true);
    try {
      await apiClient.deleteBoard(board.id);
      if (onDeleted) onDeleted();
      else navigate('/');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete board');
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
    <div className="modal modal-open bg-base-300/60 backdrop-blur-sm z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box max-w-2xl border border-base-content/10 shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 pb-0">
          <h3 className="text-3xl font-black text-base-content tracking-tight">Board Settings</h3>
          <div className="tabs tabs-boxed bg-base-200 mt-6 p-1 rounded-2xl grid grid-cols-4">
            {(['general', 'schedule', 'prioritisation', 'danger'] as const).map(tab => (
              <a 
                key={tab}
                className={`tab tab-lg rounded-xl font-bold uppercase tracking-wider text-[10px] ${activeTab === tab ? 'tab-active bg-base-100 shadow-sm text-base-content' : 'text-base-content/60 hover:bg-base-content/5'} ${tab === 'danger' ? 'hover:text-error' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'danger' ? 'Danger Zone' : tab}
              </a>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          <form id="settings-form" onSubmit={handleSave} className="space-y-6">
            
            {activeTab === 'general' && (
              <div className="space-y-6">
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
                        className={`btn h-16 rounded-2xl border-2 flex flex-col gap-1 relative overflow-hidden group hover:scale-105 transition-all
                            ${colour === c ? 'border-base-content/20 bg-base-100' : 'border-transparent bg-base-200/50'}`}
                        >
                            <div className={`w-full h-full absolute inset-0 opacity-10 bg-${c}`}></div>
                            <div className={`w-6 h-6 rounded-full bg-${c} shadow-sm z-10 scale-100 transition-transform group-hover:scale-110`}></div>
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

                <div className="form-control mb-6">
                    <label className="label">
                        <span className="label-text font-black uppercase tracking-widest text-base-content/60 text-[10px]">Scheduling Window (Days)</span>
                    </label>
                    <input 
                        type="number" 
                        min="1"
                        max="14"
                        className="input input-bordered focus:input-primary rounded-2xl h-14 text-lg font-bold bg-base-200/50 text-base-content"
                        value={schedulingWindowDays}
                        onChange={(e) => setSchedulingWindowDays(parseInt(e.target.value) || 3)}
                    />
                     <span className="label-text-alt text-[10px] opacity-50 mt-2 ml-2">How many days in the future to allow scheduling (Max 14)</span>
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

            {activeTab === 'prioritisation' && (
                <div className="space-y-6 flex flex-col items-center justify-center py-10 opacity-50">
                    <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mb-4">
                         <span className="text-3xl">⚖️</span>
                    </div>
                    <div className="text-center">
                        <h4 className="font-bold text-lg mb-2">Refinement Settings</h4>
                        <p className="text-sm max-w-xs mx-auto">Configure custom weights for sorting and prioritization logic here.</p>
                        <span className="badge mt-4">Coming Soon</span>
                    </div>
                </div>
            )}

            {activeTab === 'danger' && (
                 <div className="space-y-6">
                     <div className="alert alert-error bg-error/10 border-error/20 text-error rounded-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span className="text-xs font-bold">Warning: This action is irreversible. All cards, tags, and history associated with this board will be permanently deleted.</span>
                     </div>

                     <div className="form-control">
                        <label className="label">
                            <span className="label-text font-black uppercase tracking-widest text-error/80 text-[10px]">Type "<span className="normal-case">{board.name}</span>" to confirm</span>
                        </label>
                        <input 
                            type="text" 
                            className="input input-bordered input-error focus:input-error rounded-2xl h-14 text-lg font-bold bg-error/5 text-error w-full placeholder-error/30"
                            placeholder={board.name}
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        type="button"
                        onClick={handleDeleteBoard}
                        disabled={deleteConfirm !== board.name || loading}
                        className="btn btn-error btn-block h-14 rounded-2xl font-black text-white shadow-lg shadow-error/20"
                    >
                        {loading ? 'DELETING...' : 'DELETE BOARD PERMANENTLY'}
                    </button>
                 </div>
            )}

          </form>
        </div>

        {/* Footer */}
        {activeTab !== 'danger' && (
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
        )}
      </div>
    </div>
  );
};
