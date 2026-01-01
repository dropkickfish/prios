import { useState, useEffect } from 'react';
import type { CardType } from '../../types';
import { apiClient } from '../../api/client';

interface ExecuteProps {
  boardId: string;
  onBack: () => void;
}

export const Execute = ({ boardId, onBack }: ExecuteProps) => {
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActive = async () => {
      const statuses = await apiClient.getStatuses(boardId);
      const cards = await apiClient.getCards(boardId);
      // We need to join with statuses to know the category
      // In a real app the API would return this joined
      const joinedCards = cards.map((c: any) => ({
        ...c,
        statusCategory: statuses.find((s: any) => s.id === c.statusId)?.category
      }));
      
      const doing = joinedCards.find((c: any) => c.statusCategory === 'doing');
      setActiveCard(doing || null);
      setLoading(false);
    };

    fetchActive();
  }, [boardId]);

  const handleComplete = async () => {
    if (!activeCard) return;
    
    const statuses = await apiClient.getStatuses(boardId);
    const doneStatus = statuses.find((s: any) => s.category === 'done');
    
    if (doneStatus) {
      await apiClient.updateCardStatus(activeCard.id, doneStatus.id);
      setActiveCard(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-ring loading-lg text-primary"></span>
      </div>
    );
  }

  if (!activeCard) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-6">
        <div className="p-10 bg-base-100 rounded-full shadow-inner">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold opacity-40 uppercase tracking-widest">Nothing in "Doing"</h2>
          <p className="opacity-60">Go back to the board or prioritise your backlog.</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center p-4">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-[0.3em] text-primary font-black animate-pulse bg-primary/10 px-4 py-1 rounded-full">
          Current Focus
        </span>
      </header>

      <h1 className="text-4xl md:text-5xl font-black leading-tight text-base-content mb-8 drop-shadow-sm">
        {activeCard.title}
      </h1>
      
      {activeCard.description && (
        <div className="text-xl opacity-70 mb-12 leading-relaxed">
          {/* Slate JSON rendering would go here, for now just title/plain description */}
          {typeof activeCard.description === 'string' ? activeCard.description : 'Focus on the task at hand.'}
        </div>
      )}

      <button 
        onClick={handleComplete}
        className="btn btn-primary btn-lg w-full h-20 text-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all gap-4 border-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor font-black"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7" /></svg>
        Mark Complete
      </button>

      <div className="mt-12 flex flex-wrap justify-center gap-6">
        <button className="btn btn-ghost btn-sm text-error opacity-50 hover:opacity-100 transition-opacity">I'm Blocked</button>
        <button onClick={onBack} className="btn btn-ghost btn-sm opacity-50 hover:opacity-100 transition-opacity">Back to Board</button>
      </div>
    </div>
  );
};
