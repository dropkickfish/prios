import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import type { CardType, StatusType } from '../../types';
import { CardComponent } from '../../components/CardComponent';

export const Execute = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (boardId) {
      fetchData();
    }
  }, [boardId]);

  const fetchData = async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [boardStatuses, boardCards] = await Promise.all([
        apiClient.getStatuses(boardId),
        apiClient.getCards(boardId),
      ]);

      setStatuses(boardStatuses);
      
      const doingStatus = boardStatuses.find((s: StatusType) => s.category === 'doing');
      if (doingStatus) {
        const card = boardCards.find((c: CardType) => c.statusId === doingStatus.id);
        setActiveCard(card || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!activeCard || !boardId) return;
    
    try {
      const doneStatus = statuses.find(s => s.category === 'done');
      if (!doneStatus) throw new Error('No "Done" status found');

      await apiClient.updateCard(activeCard.id, { statusId: doneStatus.id });
      
      setActiveCard(null);
      alert('Task Completed! Great work.');
      navigate(`/boards/${boardId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    }
  };

  const handleBlocked = async () => {
    if (!activeCard || !boardId) return;

    try {
      const maybeStatus = statuses.find(s => s.category === 'maybe');
      if (!maybeStatus) throw new Error('No "Backlog" status found');

      await apiClient.updateCard(activeCard.id, { statusId: maybeStatus.id });
      setActiveCard(null);
      navigate(`/boards/${boardId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to move to blocked');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex flex-1 flex-col min-h-0 animate-in fade-in duration-500">
      <div className="flex justify-between items-center shrink-0 py-2 md:py-0">
        <div>
          <h1 className="text-sm font-black uppercase tracking-[0.3em] opacity-30">Focus Mode</h1>
          <p className="text-xl md:text-2xl font-black text-base-content">Current Task</p>
        </div>
        <button onClick={() => navigate(`/boards/${boardId}`)} className="btn btn-ghost btn-sm md:btn-md">Exit</button>
      </div>

      {!activeCard ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 md:p-20 bg-base-100 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-base-300 space-y-4">
           <p className="text-lg md:text-xl font-bold opacity-30 uppercase tracking-widest text-base-content">Nothing in progress</p>
           <button onClick={() => navigate(`/boards/${boardId}/prioritise`)} className="btn btn-primary text-white px-6 md:px-8">Start Triage</button>
        </div>
      ) : (
        <>
          {/* Mobile: sticky action bar at bottom so buttons are always visible without scrolling */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-base-100/95 backdrop-blur border-t border-base-content/10 p-3 flex gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
            <button
              onClick={handleComplete}
              className="btn btn-primary flex-1 text-white shadow-lg"
            >
              Mark Complete
            </button>
            <button
              onClick={handleBlocked}
              className="btn btn-outline flex-1"
            >
              Blocked / Later
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-1 min-h-0 mt-3 md:mt-6 pb-24 md:pb-0">
             <div className="md:col-span-2 min-h-0 flex-1 flex flex-col min-h-0">
                <div className="flex-1 min-h-0 flex flex-col shadow-xl md:shadow-2xl border-2 border-primary/10 rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-base-100">
                  <CardComponent
                    card={activeCard}
                    statuses={statuses}
                    fillHeight
                    showActions={false}
                    showFullDescription
                  />
                </div>
             </div>
             
             <div className="hidden md:flex flex-col gap-3 shrink-0">
               <div className="card bg-base-100 shadow-xl p-4 md:p-5 space-y-4">
                  <h3 className="font-black uppercase tracking-widest text-xs opacity-40">Actions</h3>
                  <button 
                    onClick={handleComplete}
                    className="btn btn-primary btn-lg w-full text-white shadow-lg shadow-primary/20"
                  >
                    Mark Complete
                  </button>
                  <button 
                    onClick={handleBlocked}
                    className="btn btn-outline btn-lg w-full"
                  >
                    Blocked / Later
                  </button>
               </div>
               <div className="card bg-primary/5 p-4 md:p-5 border border-primary/10">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Pro Tip</p>
                  <p className="text-sm opacity-70 text-base-content">Focus on one thing at a time. Multi-tasking is a myth that drains your velocity.</p>
               </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
};
