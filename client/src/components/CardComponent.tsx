import type { CardType, StatusType } from '../types';

interface CardComponentProps {
  card: CardType;
  statuses?: StatusType[]; // Optional to prevent breaking other usages if any
  onStatusChange?: (id: string, newStatusId: string) => void;
  onClick?: (id: string) => void;
  onSchedule?: (card: CardType) => void;
  showActions?: boolean;
}

export const CardComponent = ({ card, statuses, onStatusChange, onClick, onSchedule, showActions = false }: CardComponentProps) => {
  const getDifficultyColor = (difficulty: number) => {
    const colours = ['text-success', 'text-info', 'text-warning', 'text-error', 'text-error font-bold'];
    return colours[difficulty - 1] || 'text-base-content';
  };

  const currentStatus = statuses?.find(s => s.id === card.statusId);
  const isMaybe = currentStatus?.category === 'maybe';

  return (
    <div 
      className="card bg-base-100 shadow-sm hover:shadow-md transition-all cursor-pointer border border-base-content/5 group/card"
      onClick={() => onClick?.(card.id)}
    >
      <div className="card-body p-4 gap-3">
        {/* Header */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="card-title text-base font-bold leading-tight">{card.title}</h3>
        </div>
        
        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-wider opacity-60">
          <span className={`${getDifficultyColor(card.difficulty)}`}>
            Diff: {card.difficulty}
          </span>
          <span>•</span>
          <span>
            Prio: {card.priority}
          </span>
          {card.smartScore !== undefined && (
            <>
              <span>•</span>
              <span className="text-secondary">
                Value: {card.smartScore}
              </span>
            </>
          )}
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map(tag => (
              <span 
                key={tag.id} 
                className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-base-content/5 text-base-content/60 border border-base-content/10 group-hover/card:bg-primary/10 group-hover/card:text-primary group-hover/card:border-primary/20 transition-colors"
                title={`#${tag.name}`}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {card.scheduledAt && (
          <div className="flex items-center gap-1 text-[10px] opacity-40 uppercase font-black bg-base-200/50 py-1 px-2 rounded-md self-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
            </svg>
            {new Date(card.scheduledAt).toLocaleDateString('en-GB')}
          </div>
        )}

        {/* Action Footer - Always visible if showActions is true */}
        {showActions && (
            <div className="pt-3 mt-1 border-t border-base-content/5 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                {isMaybe && onSchedule && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSchedule(card); }}
                        className="btn btn-xs btn-primary btn-outline w-full gap-1 rounded-lg font-black text-[9px] uppercase tracking-wider"
                    >
                        ⚡ Schedule Now
                    </button>
                )}
                
                {statuses && onStatusChange && (
                    <div className="flex flex-wrap gap-1 justify-start">
                        {statuses.filter(s => s.id !== card.statusId).map(s => (
                            <button 
                                key={s.id}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(card.id, s.id); }}
                                className="btn btn-xs btn-ghost h-6 min-h-0 text-[9px] uppercase font-bold tracking-tight hover:bg-base-content/5 text-base-content/50 hover:text-base-content px-2 rounded-md"
                            >
                                → {s.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
