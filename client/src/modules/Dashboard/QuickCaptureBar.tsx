import { useMemo, useRef, useState } from 'react';
import { computeEisenhowerResult } from './eisenhowerLogic';
import { TipTapEditor } from '../../components/TipTapEditor';

export interface QuickCapturePayload {
  title: string;
  description?: string;
  images?: File[];
  priority?: number;
  difficulty?: number;
}

interface QuickCaptureBarProps {
  placeholder?: string;
  onSubmit: (payload: QuickCapturePayload) => Promise<void>;
  backlogCount?: number;
  disabled?: boolean;
  className?: string;
}

export function QuickCaptureBar({
  placeholder = 'What needs doing?',
  onSubmit,
  backlogCount = 0,
  disabled = false,
  className = '',
}: QuickCaptureBarProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [important, setImportant] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [complexity, setComplexity] = useState<1 | 2 | 3>(2);
  const [time, setTime] = useState<1 | 2>(1);
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const detailsId = 'quick-capture-eisenhower-details';

  const eisenhowerResult = useMemo(
    () => computeEisenhowerResult({ important, urgent, complex: complexity, time }),
    [important, urgent, complexity, time]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: t,
        description: showDetails ? description : undefined,
        images: showDetails && selectedImages.length > 0 ? selectedImages : undefined,
        priority: showDetails ? eisenhowerResult.priority : undefined,
        difficulty: showDetails ? eisenhowerResult.difficulty : undefined,
      });
      setTitle('');
      setDescription('');
      setSelectedImages([]);
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div
          className={`grid transition-all duration-300 ease-out ${showDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          aria-hidden={!showDetails}
        >
          <div className="overflow-hidden">
            <div id={detailsId} className="rounded-2xl border border-primary/20 bg-primary/5 p-3 mb-2 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/65">Quick add details</p>
                <span className="text-[10px] font-semibold text-base-content/55">
                  P{eisenhowerResult.priority} · D{eisenhowerResult.difficulty}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55">Description</p>
                <TipTapEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Add context, links, bullets, or checklist notes..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55">Images</p>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="btn btn-xs btn-ghost border border-base-content/20"
                  >
                    Add images
                  </button>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length === 0) return;
                    setSelectedImages((prev) => [...prev, ...files]);
                    e.currentTarget.value = '';
                  }}
                />
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedImages.map((file, idx) => (
                      <span key={`${file.name}-${idx}`} className="badge badge-ghost gap-2 py-3 px-3 rounded-xl border border-base-content/20">
                        <span className="max-w-[11rem] truncate text-[11px]">{file.name}</span>
                        <button
                          type="button"
                          className="opacity-60 hover:opacity-100"
                          onClick={() => setSelectedImages((prev) => prev.filter((_, i) => i !== idx))}
                          aria-label={`Remove ${file.name}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55 mb-2">Eisenhower quick triage</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setImportant(v => !v)}
                  className={`btn btn-xs rounded-full px-3 ${important ? 'btn-primary' : 'btn-ghost border border-base-content/20'}`}
                >
                  Important
                </button>
                <button
                  type="button"
                  onClick={() => setUrgent(v => !v)}
                  className={`btn btn-xs rounded-full px-3 ${urgent ? 'btn-secondary' : 'btn-ghost border border-base-content/20'}`}
                >
                  Urgent
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-base-content/50">Complexity</span>
                  <div className="join w-full">
                    <button type="button" onClick={() => setComplexity(1)} className={`join-item btn btn-xs flex-1 ${complexity === 1 ? 'btn-active btn-primary' : 'btn-ghost border border-base-content/20'}`}>Low</button>
                    <button type="button" onClick={() => setComplexity(2)} className={`join-item btn btn-xs flex-1 ${complexity === 2 ? 'btn-active btn-primary' : 'btn-ghost border border-base-content/20'}`}>Mid</button>
                    <button type="button" onClick={() => setComplexity(3)} className={`join-item btn btn-xs flex-1 ${complexity === 3 ? 'btn-active btn-primary' : 'btn-ghost border border-base-content/20'}`}>High</button>
                  </div>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-base-content/50">Duration</span>
                  <div className="join w-full">
                    <button type="button" onClick={() => setTime(1)} className={`join-item btn btn-xs flex-1 ${time === 1 ? 'btn-active btn-secondary' : 'btn-ghost border border-base-content/20'}`}>{"<1h"}</button>
                    <button type="button" onClick={() => setTime(2)} className={`join-item btn btn-xs flex-1 ${time === 2 ? 'btn-active btn-secondary' : 'btn-ghost border border-base-content/20'}`}>{">1h"}</button>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-base opacity-50 shrink-0">+</span>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            className="input input-ghost flex-1 min-w-0 bg-base-200/60 border border-base-content/10 rounded-xl px-4 py-2.5 text-sm font-medium placeholder:text-base-content/40 focus:border-primary/40"
            aria-label="Quick add task"
          />
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            aria-expanded={showDetails}
            aria-controls={detailsId}
            className={`btn btn-ghost btn-sm shrink-0 border ${showDetails ? 'border-primary/40 text-primary' : 'border-base-content/20 text-base-content/70'}`}
          >
            {showDetails ? 'Hide details' : 'Add details'}
          </button>
          <button
            type="submit"
            disabled={!title.trim() || submitting || disabled}
            className="btn btn-ghost btn-sm opacity-50 hover:opacity-100 disabled:opacity-30 shrink-0"
          >
            {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Add'}
          </button>
        </div>
      </form>
      {backlogCount > 20 && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-warning/90 mt-1.5 px-1">
          Your backlog is getting heavy ({backlogCount} items). Triage or archive to stay focused.
        </p>
      )}
    </div>
  );
}
