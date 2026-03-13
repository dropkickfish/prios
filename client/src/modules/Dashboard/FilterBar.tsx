import { useRef, useEffect } from 'react';

interface FilterBarProps {
  value: string;
  onFilterChange: (text: string) => void;
  onClose?: () => void;
  focusOnOpen?: boolean;
}

export const FilterBar = ({ value, onFilterChange, onClose, focusOnOpen }: FilterBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focusOnOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(e.target.value);
  };

  const handleBlur = () => {
    if (value === '') {
      onClose?.();
    }
  };

  return (
    <div className="h-12 w-full max-w-lg relative z-40">
      <div className="absolute inset-0 bg-base-100/70 backdrop-blur-md border border-base-content/10 rounded-2xl flex items-center gap-2 px-2 shadow-md">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base-content/45 shrink-0" aria-hidden>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Filter cards"
          className="bg-transparent border-none outline-none w-full h-full text-sm font-semibold placeholder:opacity-45"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          data-filter-input
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm w-10 h-10 min-h-10"
            title="Close filter"
            aria-label="Close filter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        )}
      </div>
    </div>
  );
};
