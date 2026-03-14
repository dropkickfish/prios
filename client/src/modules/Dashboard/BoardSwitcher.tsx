import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';
import { type BoardType } from '../../types';
import { useShortcut } from '../../context/KeyboardContext';

interface BoardSwitcherProps {
  currentBoard: BoardType;
  onSwitch: (boardId: string) => void;
}

const BOARD_TITLE_COLOR_CLASS: Record<string, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  neutral: 'text-neutral',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export const BoardSwitcher = ({ currentBoard, onSwitch }: BoardSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      apiClient.getBoards().then((data) => {
        setBoards(data);
        setLoading(false);
        // Focus input when opened
        setTimeout(() => inputRef.current?.focus(), 100);
      });
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Navigation
  useShortcut('board_switch', () => {
    setIsOpen(true);
  });

  const filteredBoards = boards.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[44px] px-1 text-2xl sm:text-4xl font-black tracking-tight hover:opacity-80 transition-opacity flex items-center gap-2 group ${currentBoard.colour ? BOARD_TITLE_COLOR_CLASS[currentBoard.colour] || 'text-base-content' : 'text-base-content'}`}
        aria-label="Switch board"
      >
        {currentBoard.name}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 opacity-30 group-hover:opacity-100 transition-opacity">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-base-100 shadow-2xl rounded-2xl border border-base-content/10 overflow-hidden z-50 p-2 transform origin-top-left transition-all">
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search boards..."
              className="input input-sm input-ghost w-full bg-base-200/50 focus:bg-base-200 font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                 if (e.key === 'Enter' && filteredBoards.length > 0) {
                   onSwitch(filteredBoards[0].id);
                   setIsOpen(false);
                 }
                 if (e.key === 'Escape') setIsOpen(false);
              }}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto mt-2 space-y-1">
            {loading ? (
              <div className="p-4 text-center opacity-50 text-xs font-bold uppercase tracking-widest">Loading...</div>
            ) : filteredBoards.length === 0 ? (
              <div className="p-4 text-center opacity-50 text-xs font-bold">No boards found</div>
            ) : (
              filteredBoards.map(board => (
                <button
                  key={board.id}
                  onClick={() => {
                    onSwitch(board.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group hover:bg-base-200 transition-colors ${board.id === currentBoard.id ? 'bg-primary/5 text-primary' : ''}`}
                >
                   <span className="font-bold">{board.name}</span>
                   {board.id === currentBoard.id && (
                     <span className="text-xs uppercase font-black tracking-wider opacity-50">Current</span>
                   )}
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t border-base-content/5 mt-1 text-[10px] opacity-40 text-center font-bold">
            Press [Esc] to close
          </div>
        </div>
      )}
    </div>
  );
};
