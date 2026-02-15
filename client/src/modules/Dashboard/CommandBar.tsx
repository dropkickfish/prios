import { useState, useEffect, useRef } from 'react';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAdd: (title: string) => Promise<void>;
  placeholder?: string;
}

export function CommandBar({ isOpen, onClose, onQuickAdd, placeholder = 'add write proposal, schedule demo...' }: CommandBarProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    await onQuickAdd(t);
    setInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-base-content/20 backdrop-blur-sm" onClick={onClose} role="dialog" aria-label="Command bar">
      <div className="w-full max-w-xl bg-base-100 border border-base-content/10 shadow-2xl rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex items-center gap-3 p-3">
          <span className="text-base-content/40 font-mono text-sm">/</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 input input-ghost border-none focus:outline-none focus:ring-0 bg-transparent px-0 font-medium"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-sm rounded-xl shrink-0">
            Add
          </button>
        </form>
        <p className="px-4 pb-3 text-[10px] uppercase tracking-widest opacity-40">
          Quick add to Backlog · Refine later
        </p>
      </div>
    </div>
  );
}
