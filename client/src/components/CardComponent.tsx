import type { CardType } from '../types';

interface CardComponentProps {
  card: CardType;
  onStatusChange?: (id: string, newStatusId: string) => void;
  onClick?: (id: string) => void;
}

export const CardComponent = ({ card, onClick }: CardComponentProps) => {
  const getDifficultyColor = (difficulty: number) => {
    const colours = ['text-success', 'text-info', 'text-warning', 'text-error', 'text-error font-bold'];
    return colours[difficulty - 1] || 'text-base-content';
  };

  return (
    <div 
      className="card bg-base-100 shadow-md hover:shadow-xl transition-shadow cursor-pointer border-l-4 border-secondary"
      onClick={() => onClick?.(card.id)}
    >
      <div className="card-body p-4 gap-3">
        <div className="flex justify-between items-start">
          <h3 className="card-title text-lg leading-tight">{card.title}</h3>
        </div>
        
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`badge badge-ghost badge-sm ${getDifficultyColor(card.difficulty)} uppercase font-bold tracking-tighter`}>
            Diff: {card.difficulty}
          </span>
          <span className="badge badge-outline badge-sm opacity-60 uppercase font-bold tracking-tighter">
            Prio: {card.priority}
          </span>
        </div>

        {card.scheduledAt && (
          <div className="flex items-center gap-1 text-[10px] opacity-40 uppercase font-black">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
            </svg>
            {new Date(card.scheduledAt).toLocaleDateString('en-GB')}
          </div>
        )}
      </div>
    </div>
  );
};
