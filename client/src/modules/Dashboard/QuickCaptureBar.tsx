import { useState, useRef } from 'react';

interface QuickCaptureBarProps {
  placeholder?: string;
  onSubmit: (title: string) => Promise<void>;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(t);
      setTitle('');
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
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
          type="submit"
          disabled={!title.trim() || submitting}
          className="btn btn-ghost btn-sm opacity-50 hover:opacity-100 disabled:opacity-30 shrink-0"
        >
          {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Add'}
        </button>
      </form>
      {backlogCount > 20 && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-warning/90 mt-1.5 px-1">
          Your backlog is getting heavy ({backlogCount} items). Triage or archive to stay focused.
        </p>
      )}
    </div>
  );
}
