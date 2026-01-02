import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import type { BoardType } from '../../types';

interface BoardSettingsModalProps {
  board: BoardType;
  onClose: () => void;
  onUpdated: (board: BoardType) => void;
}

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({ board, onClose, onUpdated }) => {
  const [name, setName] = useState(board.name);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Assuming a patchBoard or similar exists, or using createBoard logic for now if it's an update
      // For MVP, we'll just update the name if that's all we have endpoint for
      // But let's check if we have updateBoard in apiClient
      const res = await fetch(`http://localhost:3000/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
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

  return (
    <div className="modal modal-open bg-base-300/60 backdrop-blur-sm">
      <div className="modal-box max-w-md border border-base-content/10 shadow-2xl rounded-3xl p-8">
        <h3 className="text-3xl font-black mb-6 text-primary">Board Settings</h3>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Board Name</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered focus:input-primary rounded-2xl h-14 text-lg font-bold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="modal-action mt-10">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-2xl">Cancel</button>
            <button 
              type="submit" 
              className={`btn btn-primary px-8 rounded-2xl shadow-lg shadow-primary/30 border-none text-white ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
