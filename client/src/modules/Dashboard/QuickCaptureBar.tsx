import { useEffect, useMemo, useRef, useState } from 'react';
import { computeEisenhowerResult } from './eisenhowerLogic';
import { TipTapEditor } from '../../components/TipTapEditor';
import { EisenhowerMatrixHelper } from './EisenhowerMatrixHelper';

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
  focusOnOpen?: boolean;
  focusRequestId?: number;
  onDetailsVisibilityChange?: (isVisible: boolean) => void;
  collapseDetailsSignal?: number;
}

export function QuickCaptureBar({
  placeholder = 'What needs doing?',
  onSubmit,
  backlogCount = 0,
  disabled = false,
  className = '',
  focusOnOpen = false,
  focusRequestId,
  onDetailsVisibilityChange,
  collapseDetailsSignal,
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
  const [descriptionFocusSignal, setDescriptionFocusSignal] = useState<number | undefined>(undefined);
  const [showPriorityWizard, setShowPriorityWizard] = useState(false);
  const [priorityOverride, setPriorityOverride] = useState<number | null>(null);
  const [difficultyOverride, setDifficultyOverride] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCollapseSignalRef = useRef<number | undefined>(collapseDetailsSignal);
  const detailsId = 'quick-capture-eisenhower-details';

  const eisenhowerResult = useMemo(
    () => computeEisenhowerResult({ important, urgent, complex: complexity, time }),
    [important, urgent, complexity, time]
  );
  const effectivePriority = priorityOverride ?? eisenhowerResult.priority;
  const effectiveDifficulty = difficultyOverride ?? eisenhowerResult.difficulty;

  useEffect(() => {
    if (disabled) return;
    if (!focusOnOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusOnOpen, focusRequestId, disabled]);

  useEffect(() => {
    if (collapseDetailsSignal === undefined) return;
    if (lastCollapseSignalRef.current === collapseDetailsSignal) return;
    lastCollapseSignalRef.current = collapseDetailsSignal;
    if (!showDetails) return;
    setShowDetails(false);
    onDetailsVisibilityChange?.(false);
  }, [collapseDetailsSignal, showDetails, onDetailsVisibilityChange]);

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
        priority: showDetails ? effectivePriority : undefined,
        difficulty: showDetails ? effectiveDifficulty : undefined,
      });
      setTitle('');
      setDescription('');
      setSelectedImages([]);
      setPriorityOverride(null);
      setDifficultyOverride(null);
      setShowDetails(false);
      onDetailsVisibilityChange?.(false);
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const toggleDetails = () => {
    setShowDetails((prev) => {
      const next = !prev;
      onDetailsVisibilityChange?.(next);
      if (next) {
        setDescriptionFocusSignal((signal) => (signal ?? 0) + 1);
      }
      return next;
    });
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="h-full min-h-0 flex flex-col">
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
            onClick={toggleDetails}
            aria-expanded={showDetails}
            aria-controls={detailsId}
            className={`btn btn-ghost btn-sm shrink-0 border ${showDetails ? 'border-primary/40 text-primary' : 'border-base-content/20 text-base-content/70'}`}
          >
            {showDetails ? 'Hide details' : 'Add details'}
          </button>
          <button
            type="submit"
            disabled={!title.trim() || submitting || disabled}
            className="btn btn-primary btn-sm text-primary-content border-0 shadow-sm hover:shadow-md disabled:btn-disabled shrink-0 px-4"
          >
            {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Add'}
          </button>
        </div>

        <div
          className={`grid transition-all duration-300 ease-out min-h-0 ${showDetails ? 'mt-2 grid-rows-[1fr] opacity-100 flex-1' : 'grid-rows-[0fr] opacity-0'}`}
          aria-hidden={!showDetails}
        >
          <div className="overflow-hidden">
            <div id={detailsId} className="rounded-2xl border border-primary/20 bg-primary/5 p-3 mb-2 space-y-4 h-full min-h-0 overflow-y-auto">
              <div className="space-y-2 [&_.ProseMirror]:min-h-[220px]">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55">Description</p>
                <TipTapEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Add context, links, bullets, or checklist notes..."
                  focusSignal={descriptionFocusSignal}
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55 text-center">Priority</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPriorityOverride(null);
                        setDifficultyOverride(null);
                        setImportant(v => !v);
                      }}
                      className={`btn btn-xs rounded-full px-3 ${important ? 'btn-primary' : 'btn-ghost border border-base-content/20'}`}
                    >
                      Important
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPriorityOverride(null);
                        setDifficultyOverride(null);
                        setUrgent(v => !v);
                      }}
                      className={`btn btn-xs rounded-full px-3 ${urgent ? 'btn-secondary' : 'btn-ghost border border-base-content/20'}`}
                    >
                      Urgent
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 min-[850px]:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55 text-center">Complexity</p>
                    <div className="join w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityOverride(null);
                          setDifficultyOverride(null);
                          setComplexity(1);
                        }}
                        className={`join-item btn btn-xs flex-1 ${complexity === 1 ? 'btn-active btn-primary' : 'btn-ghost border border-base-content/20'}`}
                      >
                        Low
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityOverride(null);
                          setDifficultyOverride(null);
                          setComplexity(2);
                        }}
                        className={`join-item btn btn-xs flex-1 ${complexity === 2 ? 'btn-active btn-primary' : 'btn-ghost border border-base-content/20'}`}
                      >
                        Mid
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityOverride(null);
                          setDifficultyOverride(null);
                          setComplexity(3);
                        }}
                        className={`join-item btn btn-xs flex-1 ${complexity === 3 ? 'btn-active btn-primary' : 'btn-ghost border border-base-content/20'}`}
                      >
                        High
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55 text-center">Duration</p>
                    <div className="join w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityOverride(null);
                          setDifficultyOverride(null);
                          setTime(1);
                        }}
                        className={`join-item btn btn-xs flex-1 ${time === 1 ? 'btn-active btn-secondary' : 'btn-ghost border border-base-content/20'}`}
                      >
                        {'<1h'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityOverride(null);
                          setDifficultyOverride(null);
                          setTime(2);
                        }}
                        className={`join-item btn btn-xs flex-1 ${time === 2 ? 'btn-active btn-secondary' : 'btn-ghost border border-base-content/20'}`}
                      >
                        {'>1h'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-base-content/15 bg-base-100/50 p-3 space-y-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-base-content/55">Need help deciding?</p>
                  <p className="text-xs text-base-content/70">Use the Eisenhower wizard for a guided recommendation.</p>
                  <div className="rounded-lg border border-base-content/15 bg-base-200/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-base-content/55">Current recommendation</p>
                    <p className="text-sm font-bold text-base-content mt-0.5">P{effectivePriority} · D{effectiveDifficulty}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPriorityWizard(true)}
                    className="btn btn-sm btn-primary w-full text-primary-content"
                  >
                    Open Eisenhower wizard
                  </button>
                  {(priorityOverride !== null || difficultyOverride !== null) && (
                    <p className="text-[10px] font-semibold text-base-content/70">
                      Using wizard values: P{effectivePriority} · D{effectiveDifficulty}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
      {backlogCount > 20 && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-warning/90 mt-1.5 px-1">
          Your backlog is getting heavy ({backlogCount} items). Triage or archive to stay focused.
        </p>
      )}
      {showPriorityWizard && (
        <EisenhowerMatrixHelper
          onCancel={() => setShowPriorityWizard(false)}
          onComplete={({ priority, difficulty }) => {
            setPriorityOverride(priority);
            setDifficultyOverride(difficulty);
            setShowPriorityWizard(false);
          }}
        />
      )}
    </div>
  );
}
