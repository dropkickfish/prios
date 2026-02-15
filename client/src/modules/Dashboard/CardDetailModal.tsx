import React, { useState, useEffect } from 'react';
import type { CardType, StatusType, BoardType, TagType } from '../../types';
import { apiClient } from '../../api/client';
import { EisenhowerMatrixHelper } from './EisenhowerMatrixHelper';
import { TipTapEditor } from '../../components/TipTapEditor';
import { SchedulePickerModal } from './SchedulePickerModal';

interface CardDetailModalProps {
  card: CardType;
  board?: BoardType | null;
  statuses: StatusType[];
  allCards: CardType[];
  onClose: () => void;
  onUpdated: (updatedCard?: CardType) => void;
  onDeleted: () => void;
  /** When 'panel', slides in from the right so board stays visible; default 'modal' */
  variant?: 'modal' | 'panel';
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, board, statuses, allCards, onClose, onUpdated, onDeleted, variant = 'modal' }) => {
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    difficulty: card.difficulty,
    priority: card.priority,
    statusId: card.statusId,
  });

  // Sync formData when card updates
  useEffect(() => {
    setFormData(prev => ({
        ...prev,
        title: card.title,
        description: card.description || '',
        difficulty: card.difficulty,
        priority: card.priority,
        statusId: card.statusId,
    }));
  }, [card]);

  const [showEisenhower, setShowEisenhower] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [newTagName, setNewTagName] = useState('');

  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const [dependencies, setDependencies] = useState<any[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fetch initial data
  useEffect(() => {
    fetchUpdates();
    apiClient.getTags(card.boardId).then(setAvailableTags);
    apiClient.getCardDependencies(card.id).then(setDependencies);
    
    if (card.scheduledAt) {
       apiClient.syncCalendar().then((result) => {
         if (result.moved > 0 || result.deleted > 0) {
            onUpdated();
         }
       }).catch(console.error);
    }
  }, [card.id]);

  // Immediate feedback on changes
  useEffect(() => {
    const hasChanged = 
      formData.title !== card.title ||
      formData.description !== (card.description || '') ||
      formData.difficulty !== card.difficulty ||
      formData.priority !== card.priority ||
      formData.statusId !== card.statusId;
      
      if (hasChanged) {
        setSaveStatus('saving');
      }
  }, [formData, card]);

  // Handle auto-save for formData
  useEffect(() => {
    const timer = setTimeout(async () => {
      const hasChanged = 
        formData.title !== card.title ||
        formData.description !== (card.description || '') ||
        formData.difficulty !== card.difficulty ||
        formData.priority !== card.priority ||
        formData.statusId !== card.statusId;

      if (hasChanged) {
        try {
          await apiClient.updateCard(card.id, formData);
          setSaveStatus('saved');
          onUpdated();
        } catch (err) {
          setSaveStatus('error');
        }
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [formData, card.id]);

  const handleAddTag = async (tagId: string) => {
    if (card.tags?.some(t => t.id === tagId)) return;
    setSaveStatus('saving');
    await apiClient.addCardTag(card.id, tagId);
    setSaveStatus('saved');
    onUpdated();
  };

  const handleCreateTag = async () => {
     const lowerName = newTagName.trim().toLowerCase();
     if (!lowerName) return;
     
     if (card.tags?.some(t => t.name.toLowerCase() === lowerName)) {
        setNewTagName('');
        return;
     }

     setSaveStatus('saving');
     try {
       const newTag = await apiClient.createTag({ 
         name: lowerName, 
         boardId: card.boardId 
       });
       setNewTagName('');
       setAvailableTags(prev => {
         if (prev.some(t => t.id === newTag.id)) return prev;
         return [...prev, newTag];
       });
       await apiClient.addCardTag(card.id, newTag.id);
       setSaveStatus('saved');
       onUpdated();
     } catch (err) {
       console.error("Failed to create tag", err);
       setSaveStatus('error');
     }
  };

  const handleRemoveTag = async (tagId: string) => {
    setSaveStatus('saving');
    await apiClient.deleteCardTag(card.id, tagId);
    setSaveStatus('saved');
    onUpdated();
  };

  const handleToggleDependency = async (otherCardId: string) => {
    const existing = dependencies.find(d => 
        (d.blockingCardId === card.id && d.blockedCardId === otherCardId) ||
        (d.blockingCardId === otherCardId && d.blockedCardId === card.id)
    );

    setSaveStatus('saving');
    if (existing) {
      await apiClient.deleteDependency(existing.id);
      setDependencies(prev => prev.filter(d => d.id !== existing.id));
    } else {
      // For simplicity, we assume the other card blocks *this* card
      const newDep = await apiClient.addDependency(otherCardId, card.id);
      setDependencies(prev => [...prev, newDep]);
    }
    setSaveStatus('saved');
    onUpdated();
  };

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

  const isPanel = variant === 'panel';
  return (
    <div
      className={isPanel ? 'fixed inset-0 z-[50] flex justify-end bg-base-content/20' : 'modal modal-open z-[50] bg-base-300/60 backdrop-blur-sm'}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          isPanel
            ? 'bg-base-100 border-l border-base-content/10 shadow-2xl max-w-lg w-full p-0 overflow-hidden rounded-l-3xl h-full overflow-y-auto'
            : 'modal-box bg-base-100 border border-base-content/10 shadow-2xl max-w-5xl w-full lg:w-[90%] p-0 overflow-hidden rounded-3xl max-h-[90vh]'
        }
        onClick={e => e.stopPropagation()}
      >
        {showEisenhower && (
          <EisenhowerMatrixHelper 
            onComplete={(res) => {
              setFormData({ ...formData, ...res });
              setShowEisenhower(false);
            }}
            onCancel={() => setShowEisenhower(false)}
          />
        )}

        <div className={isPanel ? 'flex flex-col h-full' : 'flex flex-col h-full max-h-[90vh]'}>
          {/* Header */}
          <div className="p-8 pb-4 border-b border-base-content/10">
            <div className="space-y-2 w-full">
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
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 pt-6">
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
                  className="select select-bordered w-full bg-base-200 border-base-content/10 rounded-xl"
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
                <div className="pt-2 border-t border-base-content/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/50">Impact score</span>
                  <p className="text-lg font-black text-primary">{(formData.priority / formData.difficulty).toFixed(2)}</p>
                  <p className="text-[9px] opacity-50">Priority ÷ difficulty — higher = more impact</p>
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

              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {card.tags?.map(tag => (
                    <span key={tag.id} className="badge badge-primary gap-1 py-3 px-3 rounded-xl font-bold text-[10px] uppercase">
                      #{tag.name}
                      <button onClick={() => handleRemoveTag(tag.id)} className="hover:text-error transition-colors">✕</button>
                    </span>
                  ))}
                </div>
                
                <div className="dropdown w-full">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add tag..." 
                      className="input input-sm input-bordered flex-1 rounded-xl bg-base-100" 
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value.toLowerCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                    />
                    <button type="button" onClick={handleCreateTag} className="btn btn-sm btn-ghost rounded-xl">+</button>
                  </div>
                  {newTagName && availableTags.filter(t => t.name.toLowerCase().includes(newTagName.toLowerCase())).length > 0 && (
                     <ul className="dropdown-content z-[60] menu p-2 shadow bg-base-100 rounded-box w-full mt-1 border border-base-content/10 max-h-40 overflow-y-auto">
                        {availableTags.filter(t => t.name.toLowerCase().includes(newTagName.toLowerCase())).map(tag => (
                          <li key={tag.id}><a onClick={() => handleAddTag(tag.id)}>#{tag.name}</a></li>
                        ))}
                     </ul>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-base-content/70">Dependencies</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-base-200/50 rounded-2xl border border-base-content/10">
                  {allCards.filter(c => c.id !== card.id).map(c => {
                    const isDependent = dependencies.some(d => 
                        (d.blockingCardId === card.id && d.blockedCardId === c.id) ||
                        (d.blockingCardId === c.id && d.blockedCardId === card.id)
                    );
                    return (
                      <label key={c.id} className="label cursor-pointer flex gap-3 p-2 bg-base-100 rounded-xl border border-base-content/5 hover:border-primary/20 transition-colors">
                        <input 
                          type="checkbox" 
                          className="checkbox checkbox-xs checkbox-primary rounded-md border-base-content/20" 
                          checked={isDependent}
                          onChange={() => handleToggleDependency(c.id)}
                        />
                        <span className="text-[10px] font-bold truncate max-w-[100px] opacity-70">{c.title}</span>
                      </label>
                    );
                  })}
                  {allCards.length <= 1 && <p className="text-[10px] opacity-30 italic p-2">No other cards</p>}
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Footer */}
          <div className="p-8 py-4 border-t border-base-content/10 flex justify-between items-center bg-base-100/50 backdrop-blur-sm">
            <button 
              className="btn btn-ghost btn-sm text-error hover:bg-error/10 rounded-xl font-bold uppercase tracking-widest text-[10px]"
              onClick={handleDelete}
            >
              Delete Card
            </button>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 min-w-[80px] justify-end">
                  {saveStatus === 'saving' ? (
                    <div className="flex items-center gap-2">
                       <span className="loading loading-spinner loading-xs text-primary"></span>
                       <span className="text-[10px] font-black uppercase text-primary tracking-widest animate-pulse">Saving...</span>
                    </div>
                  ) : saveStatus === 'saved' ? (
                    <div className="flex items-center gap-1.5 opacity-60">
                      <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                      <span className="text-[10px] font-black uppercase text-base-content/50 tracking-widest">Saved</span>
                    </div>
                  ) : saveStatus === 'error' ? (
                    <span className="text-[10px] font-black uppercase text-error tracking-widest">Error Saving</span>
                  ) : null}
                </div>
            </div>
          </div>
        </div>
        {showSchedulePicker && (
          <SchedulePickerModal 
            card={card}
            schedulingWindowDays={board?.schedulingWindowDays || 3}
            onClose={() => setShowSchedulePicker(false)}
            onScheduled={onCardScheduled}
          />
        )}
      </div>
    </div>
  );
};
