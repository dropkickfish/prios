import { useState, useEffect } from 'react';
import type { CardType, StatusType } from '../../types';
import { apiClient } from '../../api/client';

interface PrioritiseProps {
  boardId: string;
  onBack: () => void;
  onViewExecute: () => void;
}

export const Prioritise = ({ boardId, onBack, onViewExecute }: PrioritiseProps) => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [boardStatuses, boardCards] = await Promise.all([
        apiClient.getStatuses(boardId),
        apiClient.getCards(boardId),
      ]);

      setStatuses(boardStatuses);
      
      // Filter for cards in 'maybe' category
      const joinedCards = boardCards.map((c: any) => ({
        ...c,
        statusCategory: boardStatuses.find((s: StatusType) => s.id === c.statusId)?.category
      }));
      
      const maybeCards = joinedCards.filter((c: any) => c.statusCategory === 'maybe');
      setCards(maybeCards);
      setLoading(false);
    };

    fetchData();
  }, [boardId]);

  const handleDecision = async (decision: 'yes' | 'no') => {
    const activeCard = cards[currentIndex];
    if (!activeCard) return;

    if (decision === 'yes') {
      const doingStatus = statuses.find(s => s.category === 'doing');
      if (doingStatus) {
        try {
          await apiClient.updateCardStatus(activeCard.id, doingStatus.id);
          onViewExecute();
          return;
        } catch (err: any) {
          setError(err.message || 'Failed to move to Doing. Is another task already in progress?');
          return;
        }
      }
    } else {
       // Move to next card in the maybe pile
       setCurrentIndex(prev => prev + 1);
    }
  };

  if (loading) {
    return (
       <div className="flex justify-center p-20">
         <span className="loading loading-ring loading-lg text-secondary"></span>
       </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-6">
        <div className="p-10 bg-base-100 rounded-full shadow-inner">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-success opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold opacity-40 uppercase tracking-widest text-base-content">Backlog Triaged</h2>
          <p className="opacity-60 text-base-content/70">No more "Maybe" tasks for now. Great work!</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost">Back to Dashboard</button>
      </div>
    );
  }

  const activeCard = cards[currentIndex];

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center p-4">
      <header className="mb-12 flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-secondary font-black bg-secondary/10 px-4 py-1 rounded-full w-fit mx-auto">
          Triage Mode
        </span>
        <p className="text-[10px] opacity-40 uppercase font-bold">
          Card {currentIndex + 1} of {cards.length}
        </p>
      </header>

      {error && (
        <div className="alert alert-error mb-8 shadow-lg text-xs font-bold uppercase tracking-tight">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-xs">OK</button>
        </div>
      )}

      <div className="card bg-base-100 shadow-2xl w-full border-b-8 border-secondary h-80 flex flex-col justify-center p-8 transition-transform hover:scale-[1.01]">
        <h1 className="text-3xl font-black leading-tight text-base-content mb-4">
          {activeCard.title}
        </h1>
        <div className="flex justify-center gap-2 mb-4">
           <span className="badge badge-outline badge-xs opacity-50 uppercase font-black tracking-tighter">Diff: {activeCard.difficulty}</span>
           <span className="badge badge-outline badge-xs opacity-50 uppercase font-black tracking-tighter">Prio: {activeCard.priority}</span>
        </div>
        {activeCard.description && (
          <p className="text-sm opacity-60 line-clamp-3 leading-relaxed">
            {typeof activeCard.description === 'string' ? activeCard.description : 'Decide if this is your focus for today.'}
          </p>
        )}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6 w-full px-4">
        <button 
          onClick={() => handleDecision('no')}
          className="btn btn-outline btn-lg h-20 text-xl gap-2 border-2 hover:bg-base-200 hover:text-base-content"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          Not Today
        </button>
        <button 
          onClick={() => handleDecision('yes')}
          className="btn btn-secondary btn-lg h-20 text-xl shadow-xl shadow-secondary/30 gap-2 border-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
          Focus Now
        </button>
      </div>

      <button onClick={onBack} className="mt-10 btn btn-ghost btn-sm opacity-40 hover:opacity-100 transition-opacity">
        Wait, take me back
      </button>
    </div>
  );
};
