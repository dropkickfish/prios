import React, { useState } from 'react';
import type { CardType, StatusType } from '../../types';
import { apiClient } from '../../api/client';
import { EisenhowerMatrixHelper } from './EisenhowerMatrixHelper';

interface CardDetailModalProps {
  card: CardType;
  statuses: StatusType[];
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, statuses, onClose, onUpdated, onDeleted }) => {
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    difficulty: card.difficulty,
    priority: card.priority,
    statusId: card.statusId,
  });
  const [showEisenhower, setShowEisenhower] = useState(false);
  const [saving, setSaving] = useState(false);

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
    <div className="modal modal-open">
      <div className="modal-box bg-slate-900 border border-slate-700 shadow-2xl max-w-2xl p-0 overflow-hidden rounded-3xl">
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
          <div className="flex justify-between items-start">
            <input 
              className="text-3xl font-black bg-transparent border-none text-white focus:ring-0 w-full p-0 placeholder-slate-700"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Card Title"
            />
            <button className="btn btn-ghost btn-sm text-slate-500" onClick={onClose}>✕</button>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2 space-y-6">
              <div className="form-control">
                <label className="label uppercase text-[10px] font-black tracking-widest text-slate-500">Description</label>
                <textarea 
                  className="textarea textarea-bordered bg-slate-800 border-slate-700 text-white h-48 focus:border-primary transition-colors rounded-2xl"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What needs to be done?"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="form-control">
                <label className="label uppercase text-[10px] font-black tracking-widest text-slate-500">Status</label>
                <select 
                  className="select select-bordered bg-slate-800 border-slate-700 text-white rounded-xl"
                  value={formData.statusId}
                  onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                >
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 space-y-6 relative group/eval">
                <button 
                  onClick={() => setShowEisenhower(true)}
                  className="absolute top-4 right-4 btn btn-circle btn-xs btn-ghost hover:bg-primary/20 hover:text-primary transition-all"
                  title="Re-evaluate with Eisenhower Matrix"
                >
                  ✨
                </button>

                <div className="form-control">
                  <label className="label uppercase text-[10px] font-black tracking-widest text-slate-500">Priority</label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-white">P{formData.priority}</span>
                    <input 
                      type="range" min="1" max="4" 
                      className="range range-xs range-primary flex-1"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label uppercase text-[10px] font-black tracking-widest text-slate-500">Difficulty</label>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-white">D{formData.difficulty}</span>
                    <input 
                      type="range" min="1" max="5" 
                      className="range range-xs range-secondary flex-1"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              {card.scheduledAt && (
                <div className="form-control">
                  <label className="label uppercase text-[10px] font-black tracking-widest text-slate-500">Scheduled</label>
                  <div className="text-sm font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                    {new Date(card.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-slate-800">
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
      </div>
    </div>
  );
};
