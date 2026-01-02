import React, { useState, useEffect } from 'react';
import type { CardType, StatusType } from '../../types';
import { apiClient } from '../../api/client';
import { EisenhowerMatrixHelper } from './EisenhowerMatrixHelper';
import { TipTapEditor } from '../../components/TipTapEditor';
import { SchedulePickerModal } from './SchedulePickerModal';

interface CardDetailModalProps {
  card: CardType;
  statuses: StatusType[];
  allCards: CardType[];
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, statuses, allCards, onClose, onUpdated, onDeleted }) => {
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    difficulty: card.difficulty,
    priority: card.priority,
    statusId: card.statusId,
  });
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [showEisenhower, setShowEisenhower] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  React.useEffect(() => {
    fetchUpdates();
  }, [card.id]);

  const fetchUpdates = async () => {
    setLoadingUpdates(true);
    try {
      const data = await apiClient.getCardUpdates(card.id);
      setUpdates(data);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await apiClient.addCardUpdate(card.id, newComment);
    setNewComment('');
    fetchUpdates();
  };

  const handleSchedule = async () => {
    setShowSchedulePicker(true);
  };

  const onCardScheduled = (_scheduledAt: string) => {
    setShowSchedulePicker(false);
    onUpdated();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateCard(card.id, formData);
      onUpdated();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to update card');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this card?')) return;
    try {
      await apiClient.deleteCard(card.id);
      onDeleted();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to delete card');
    }
  };

  return (
    <div className="modal modal-open z-[50]">
      <div className="modal-box bg-base-100 border border-base-content/10 shadow-2xl max-w-5xl w-full lg:w-[90%] p-0 overflow-hidden rounded-3xl max-h-[90vh]">
        {showEisenhower && (
          <EisenhowerMatrixHelper 
            onComplete={(res) => {
              setFormData({ ...formData, ...res });
              setShowEisenhower(false);
            }}
            onCancel={() => setShowEisenhower(false)}
          />
        )}

        <div className="p-8 space-y-8">
          <div className="space-y-2 mb-2 w-full">
            <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Card Title</label>
            <div className="flex justify-between items-center gap-4">
              <input 
                className="input w-full bg-base-content/5 border border-base-content/10 focus:border-primary/50 focus:bg-base-content/10 rounded-2xl h-12 text-base font-bold px-4 transition-all placeholder:text-base-content/30"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Card Title"
              />
              <button className="btn btn-ghost btn-sm text-base-content/30 hover:text-base-content hover:bg-base-content/10" onClick={onClose}>✕</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70 mb-2">Description & Context</label>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <TipTapEditor 
                    content={formData.description} 
                    onChange={(val) => setFormData({ ...formData, description: val })}
                    placeholder="What needs to be done?"
                  />
                </div>

              <div className="space-y-4 pt-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Timeline & Comments</label>
                <div className="bg-base-200/50 rounded-2xl border border-base-content/10 p-4 space-y-4 max-h-60 overflow-y-auto">
                  {loadingUpdates ? (
                    <div className="flex justify-center p-4"><span className="loading loading-spinner loading-xs text-primary"></span></div>
                  ) : updates.length === 0 ? (
                    <p className="text-[10px] opacity-30 italic text-center py-4">No updates yet.</p>
                  ) : (
                    updates.map(update => (
                      <div key={update.id} className="bg-base-100 p-3 rounded-xl border border-base-content/5">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-black uppercase tracking-tighter text-primary">Update</span>
                          <span className="text-[9px] opacity-40">{new Date(update.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="text-[11px] opacity-80 leading-relaxed prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: update.content }} />
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Add a comment..."
                    className="input input-bordered bg-base-100 border-base-content/10 rounded-xl flex-1 text-xs"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button onClick={handleAddComment} className="btn btn-primary btn-sm rounded-xl">Post</button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Status</label>
                <select 
                  className="select select-bordered w-full bg-base-content/5 border-base-content/10 rounded-xl"
                  value={formData.statusId}
                  onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                >
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-base-200/50 p-6 rounded-3xl border border-base-content/10 space-y-6 relative group/eval">
                <button 
                  onClick={() => setShowEisenhower(true)}
                  className="absolute top-4 right-4 btn btn-circle btn-xs btn-ghost hover:bg-primary/20 hover:text-primary transition-all"
                  title="Re-evaluate with Eisenhower Matrix"
                >
                  ✨
                </button>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Priority</label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black">P{formData.priority}</span>
                    <input 
                      type="range" min="1" max="4" 
                      className="range range-xs range-primary flex-1"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Difficulty</label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black">D{formData.difficulty}</span>
                    <input 
                      type="range" min="1" max="5" 
                      className="range range-xs range-secondary flex-1"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Scheduled</label>
                {card.scheduledAt ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                      {new Date(card.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button onClick={handleSchedule} className="btn btn-xs btn-ghost text-primary opacity-50 hover:opacity-100 uppercase tracking-widest font-black">Reschedule</button>
                  </div>
                ) : (
                  <button onClick={handleSchedule} className="btn btn-primary btn-sm rounded-xl border-none shadow-lg shadow-primary/20 text-white font-bold uppercase tracking-widest">⚡ Schedule Now</button>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Dependencies</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-base-200/50 rounded-2xl border border-base-content/10">
                  {allCards.filter(c => c.id !== card.id).map(c => (
                    <label key={c.id} className="label cursor-pointer flex gap-3 p-2 bg-base-100 rounded-xl border border-base-content/5 hover:border-primary/20 transition-colors">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-xs checkbox-primary rounded-md border-base-content/20" 
                        checked={selectedDependencies.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedDependencies([...selectedDependencies, c.id]);
                          else setSelectedDependencies(selectedDependencies.filter(id => id !== c.id));
                        }}
                      />
                      <span className="text-[10px] font-bold truncate max-w-[100px] opacity-70">{c.title}</span>
                    </label>
                  ))}
                  {allCards.length <= 1 && <p className="text-[10px] opacity-30 italic p-2">No other cards</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-base-content/10">
            <button 
              className="btn btn-ghost text-error hover:bg-error/10"
              onClick={handleDelete}
            >
              Delete Card
            </button>
            <div className="space-x-3">
              <button className="btn btn-ghost text-slate-400" onClick={onClose}>Cancel</button>
              <button 
                className={`btn btn-primary px-8 rounded-2xl font-black uppercase tracking-widest ${saving ? 'loading' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
        {showSchedulePicker && (
          <SchedulePickerModal 
            card={card}
            onClose={() => setShowSchedulePicker(false)}
            onScheduled={onCardScheduled}
          />
        )}
      </div>
    </div>
  );
};
