import { useState, useEffect } from 'react';
import type { StatusType, CardType } from '../../types';
import { apiClient } from '../../api/client';
import { EisenhowerMatrixHelper } from './EisenhowerMatrixHelper';
import { TipTapEditor } from '../../components/TipTapEditor';

interface CreateCardModalProps {
  boardId: string;
  statuses: StatusType[];
  existingCards: CardType[];
  initialStatusId?: string | null;
  onClose: () => void;
  onCreated: (card: CardType) => void;
}

export const CreateCardModal = ({ boardId, statuses, existingCards, initialStatusId, onClose, onCreated }: CreateCardModalProps) => {
  const [title, setTitle] = useState('');

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const [description, setDescription] = useState('');
  const [statusId] = useState(initialStatusId || statuses[0]?.id || '');
  const [difficulty, setDifficulty] = useState(3);
  const [priority, setPriority] = useState(3);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEisenhower, setShowEisenhower] = useState(false);

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

      // Create dependencies
      if (selectedDependencies.length > 0) {
        await Promise.all(selectedDependencies.map(depId => 
          apiClient.addDependency(depId, newCard.id)
        ));
      }

      onCreated(newCard);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open bg-base-300/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box max-w-4xl w-full lg:w-[80%] border border-base-content/10 shadow-2xl rounded-3xl p-8" onClick={e => e.stopPropagation()}>
        <h3 className="text-3xl font-black mb-2 text-primary">New Task</h3>
        <p className="text-sm opacity-60 mb-6">Does this deserve your focus?</p>

        {error && (
          <div className="alert alert-error mb-6 shadow-md uppercase text-xs font-black tracking-widest leading-tight">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 mb-6">
            <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Task Title</label>
            <input 
              type="text" 
              placeholder="What needs doing?" 
              className="input w-full bg-base-content/5 border border-base-content/10 focus:border-primary/50 focus:bg-base-content/10 rounded-2xl h-12 text-base font-bold px-4 transition-all placeholder:text-base-content/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="label p-0">
              <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Description & Context</span>
            </label>
            <TipTapEditor 
              content={description} 
              onChange={setDescription} 
              placeholder="Add some context..."
            />
          </div>

          <div className="hidden">
             {/* Status is hidden, defaults to Maybe column via initialStatusId */}
          </div>

          <div className="flex flex-col gap-2">
            <label className="label p-0">
              <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Depends On (Blocking Tasks)</span>
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-base-200/50 rounded-2xl border border-base-content/10">
              {existingCards.length === 0 && <p className="text-[10px] opacity-30 p-2 italic">No other tasks to depend on yet.</p>}
              {existingCards.map(card => (
                <label key={card.id} className="label cursor-pointer flex gap-3 p-2 bg-base-100 rounded-xl border border-base-content/5 hover:border-primary/20 transition-colors">
                  <input 
                    type="checkbox" 
                    className="checkbox checkbox-xs checkbox-primary rounded-md border-base-content/20" 
                    checked={selectedDependencies.includes(card.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedDependencies([...selectedDependencies, card.id]);
                      else setSelectedDependencies(selectedDependencies.filter(id => id !== card.id));
                    }}
                  />
                  <span className="text-[10px] font-bold truncate max-w-[120px] opacity-70">{card.title}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 relative group/eval mt-4">
            <div className="label pt-0 pb-4">
              <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Priority & Sizing</span>
            </div>
            
            <button 
              type="button"
              onClick={() => setShowEisenhower(true)}
              className="absolute top-4 right-4 btn btn-circle btn-xs btn-ghost hover:bg-primary/20 hover:text-primary transition-all"
              title="Use Eisenhower Helper"
            >
              ✨
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-2">
                <label className="label p-0">
                  <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Difficulty (1-5)</span>
                  <span className="badge badge-primary badge-outline font-black">{difficulty}</span>
                </label>
                <input 
                  type="range" min="1" max="5" 
                  className="range range-xs range-primary" 
                  value={difficulty}
                  onChange={(e) => setDifficulty(parseInt(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="label p-0">
                  <span className="label-text font-black uppercase tracking-widest opacity-40 text-[10px]">Priority (1-4)</span>
                  <span className="badge badge-secondary badge-outline font-black">{priority}</span>
                </label>
                <input 
                  type="range" min="1" max="4" 
                  className="range range-xs range-secondary" 
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="modal-action mt-10">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-2xl text-base-content/50 hover:text-base-content hover:bg-base-content/10">Cancel</button>
            <button 
              type="submit" 
              className={`btn btn-primary px-8 rounded-2xl shadow-lg shadow-primary/30 border-none text-white ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              Create Task
            </button>
          </div>
        </form>

        {showEisenhower && (
          <div className="absolute inset-0 z-50">
            <EisenhowerMatrixHelper 
              onComplete={(res) => {
                setPriority(res.priority);
                setDifficulty(res.difficulty);
                setShowEisenhower(false);
              }}
              onCancel={() => setShowEisenhower(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
