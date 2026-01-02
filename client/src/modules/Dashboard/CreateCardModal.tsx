import { useState } from 'react';
import type { StatusType, CardType } from '../../types';
import { apiClient } from '../../api/client';

interface CreateCardModalProps {
  boardId: string;
  statuses: StatusType[];
  initialStatusId?: string | null;
  onClose: () => void;
  onCreated: (card: CardType) => void;
}

export const CreateCardModal = ({ boardId, statuses, initialStatusId, onClose, onCreated }: CreateCardModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState(initialStatusId || statuses[0]?.id || '');
  const [difficulty, setDifficulty] = useState(3);
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newCard = await apiClient.createCard(boardId, {
        title,
        description,
        statusId,
        difficulty,
        priority,
      });
      onCreated(newCard);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open bg-base-300/60 backdrop-blur-sm">
      <div className="modal-box max-w-lg border border-base-content/10 shadow-2xl rounded-3xl p-8">
        <h3 className="text-3xl font-black mb-8 text-primary">New Task</h3>

        {error && (
          <div className="alert alert-error mb-6 shadow-md uppercase text-xs font-black tracking-widest leading-tight">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Task Title</span>
            </label>
            <input 
              type="text" 
              placeholder="What needs doing?" 
              className="input input-bordered focus:input-primary rounded-2xl h-14 text-lg font-bold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Description</span>
            </label>
            <textarea 
              className="textarea textarea-bordered focus:textarea-primary rounded-2xl h-24 text-base"
              placeholder="Add some context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Status</span>
              </label>
              <select 
                className="select select-bordered rounded-2xl"
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
              >
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
               {/* Spacer for layout */}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Difficulty (1-5)</span>
                <span className="badge badge-outline font-black">{difficulty}</span>
              </label>
              <input 
                type="range" min="1" max="5" 
                className="range range-xs range-primary" 
                value={difficulty}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Priority (1-5)</span>
                <span className="badge badge-outline font-black">{priority}</span>
              </label>
              <input 
                type="range" min="1" max="5" 
                className="range range-xs range-secondary" 
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="modal-action mt-10">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-2xl">Cancel</button>
            <button 
              type="submit" 
              className={`btn btn-primary px-8 rounded-2xl shadow-lg shadow-primary/30 border-none text-white ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
