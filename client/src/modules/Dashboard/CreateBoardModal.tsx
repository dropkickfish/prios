import React, { useState } from 'react';
import { apiClient } from '../../api/client';

interface CreateBoardModalProps {
  onClose: () => void;
  onCreated: (board: any) => void;
}

export const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const newBoard = await apiClient.createBoard({ 
        name, 
        availabilitySchedule: { mon: ["09:00-17:00"], tue: ["09:00-17:00"], wed: ["09:00-17:00"], thu: ["09:00-17:00"], fri: ["09:00-17:00"] } 
      });
      onCreated(newBoard);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open bg-base-300/60 backdrop-blur-sm">
      <div className="modal-box max-w-lg border border-base-content/10 shadow-2xl rounded-3xl p-8 bg-base-100">
        <h3 className="text-3xl font-black mb-8 text-primary">New Board</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 mb-6">
            <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Board Name</label>
            <input 
              type="text" 
              placeholder="e.g. Work, Personal, Side Projects" 
              className="input w-full bg-base-content/5 border border-base-content/10 focus:border-primary/50 focus:bg-base-content/10 rounded-2xl h-12 text-base font-bold px-4 transition-all placeholder:text-base-content/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="modal-action mt-10">
            <button className="btn btn-ghost text-base-content/50 hover:text-base-content hover:bg-base-content/10 rounded-2xl" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className={`btn btn-primary px-8 rounded-2xl shadow-lg shadow-primary/30 border-none text-white ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              Create Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
