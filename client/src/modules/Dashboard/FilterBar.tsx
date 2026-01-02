import { useState, useRef, useEffect } from 'react';
import { useShortcut } from '../../context/KeyboardContext';
import { useKeyboard } from '../../context/KeyboardContext';

interface FilterBarProps {
  onFilterChange: (text: string) => void;
}

export const FilterBar = ({ onFilterChange }: FilterBarProps) => {
  const [filterText, setFilterText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { shortcuts } = useKeyboard();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  useShortcut('filter', () => {
    inputRef.current?.focus();
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setFilterText(text);
    onFilterChange(text);
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'h-32' : 'h-12'} w-full max-w-lg relative z-40`}>
       <div className={`absolute inset-0 bg-base-100/50 backdrop-blur-md border border-base-content/10 rounded-full flex flex-col overflow-hidden transition-all shadow-lg hover:shadow-xl ${isExpanded ? '!rounded-3xl' : ''}`}>
          
          {/* Main Bar */}
          <div className="flex items-center px-4 h-12 gap-3 shrink-0">
             <input 
               ref={inputRef}
               type="text" 
               placeholder={`Filter these cards... [${shortcuts.filter.key.toUpperCase()}]`}
               className="bg-transparent border-none outline-none w-full h-full text-sm font-bold placeholder:opacity-40"
               value={filterText}
               onChange={handleChange}
             />
             
             <div className="h-4 w-px bg-base-content/10 mx-1"></div>
             
             <button 
               onClick={() => setIsExpanded(!isExpanded)}
               className={`btn btn-ghost btn-circle btn-xs transition-colors ${isExpanded ? 'bg-base-content/10' : ''}`}
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
                 <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
                 <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
                 <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line>
                 <line x1="17" y1="16" x2="23" y2="16"></line>
               </svg>
             </button>
          </div>

          {/* Expanded Options */}
          <div className={`px-4 pb-4 pt-0 gap-2 flex overflow-x-auto scrollbar-hide opacity-0 transition-opacity delay-100 ${isExpanded ? 'opacity-100' : 'pointer-events-none'}`}>
             <select className="select select-bordered select-xs w-full max-w-[120px] rounded-lg font-bold">
               <option disabled selected>Board...</option>
               <option>Current Board</option>
             </select>
             <select className="select select-bordered select-xs w-full max-w-[140px] rounded-lg font-bold">
               <option disabled selected>Recently updated</option>
             </select>
              <select className="select select-bordered select-xs w-full max-w-[100px] rounded-lg font-bold">
               <option disabled selected>Status...</option>
             </select>
             <select className="select select-bordered select-xs w-full max-w-[100px] rounded-lg font-bold">
               <option disabled selected>Tagged...</option>
             </select>
          </div>
       </div>
    </div>
  );
};
