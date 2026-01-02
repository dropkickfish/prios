import { useState, useEffect } from 'react';
import type { BoardType, StatusType, CardType } from '../../types';
import { apiClient } from '../../api/client';
import { CardComponent } from '../../components/CardComponent';
import { CreateCardModal } from './CreateCardModal';
import { SchedulePickerModal } from './SchedulePickerModal';
import { CardDetailModal } from './CardDetailModal';

interface BoardViewProps {
  boardId: string;
  onBack: () => void;
}

export const BoardView = ({ boardId, onBack }: BoardViewProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [schedulingCard, setSchedulingCard] = useState<CardType | null>(null);
  const [viewerCard, setViewerCard] = useState<CardType | null>(null);
  const [board, setBoard] = useState<BoardType | null>(null);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [boards, boardStatuses, boardCards] = await Promise.all([
      apiClient.getBoards(),
      apiClient.getStatuses(boardId),
      apiClient.getCards(boardId),
    ]);

    const currentBoard = boards.find((b: any) => b.id === boardId);
    setBoard(currentBoard || null);
    setStatuses(boardStatuses);
    setCards(boardCards);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [boardId]);

  const handleStatusChange = async (cardId: string, newStatusId: string) => {
    try {
      await apiClient.updateCard(cardId, { statusId: newStatusId });
      // Refresh cards
      const boardCards = await apiClient.getCards(boardId);
      setCards(boardCards);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleSchedule = (card: CardType) => {
    setSchedulingCard(card);
  };

  const onCardScheduled = () => {
    setSchedulingCard(null);
    fetchData(); // Refresh board to show card in new lane
  };

  const getCardsByStatus = (statusId: string) => {
    return cards.filter(card => card.statusId === statusId);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!board) return <div>Board not found.</div>;

  return (
    <div className="flex flex-col h-full space-y-6">
      {showCreateModal && (
        <CreateCardModal 
          boardId={boardId} 
          statuses={statuses} 
          existingCards={cards}
          initialStatusId={selectedStatusId}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedStatusId(null);
          }}
          onCreated={() => {
             // Re-fetch all to ensure status order/categories are correct
             apiClient.getCards(boardId).then(setCards);
          }}
        />
      )}
      <div className="flex justify-between items-center px-4">
        <div>
          <h1 className="text-4xl font-black text-base-content tracking-tight">{board.name}</h1>
          <div className="flex items-center gap-2 opacity-50 text-xs font-bold uppercase tracking-widest mt-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Mission Control
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onBack} className="btn btn-ghost btn-sm rounded-xl px-4">Back</button>
          {statuses.some(s => s.category === 'maybe') && (
            <button 
              disabled={!!(showCreateModal || viewerCard || schedulingCard)}
              onClick={() => {
                const firstMaybe = statuses.find(s => s.category === 'maybe');
                if (firstMaybe) {
                  setSelectedStatusId(firstMaybe.id);
                  setShowCreateModal(true);
                }
              }} 
              className="btn btn-primary btn-sm px-6 text-white border-none shadow-lg shadow-primary/20 rounded-xl font-bold"
            >
              Add Card
            </button>
          )}
        </div>
      </div>

      <div className="flex overflow-x-auto gap-8 px-4 pb-12 min-h-[75vh] items-start scrollbar-hide">
        {statuses.sort((a,b) => a.order - b.order).map(status => (
          <div key={status.id} className="flex-shrink-0 w-80 flex flex-col gap-6">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-3">
                 <div className={`w-2 h-6 rounded-full ${
                   status.category === 'doing' ? 'bg-primary' : 
                   status.category === 'scheduled' ? 'bg-secondary' : 
                   status.category === 'done' ? 'bg-success' : 
                   status.category === 'maybe' ? 'bg-info' : 'bg-base-content/20'
                 }`}></div>
                 <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-50">{status.name}</h2>
                 <span className="badge badge-sm badge-ghost font-bold opacity-30">{getCardsByStatus(status.id).length}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-5 p-5 bg-base-200/30 rounded-[2.5rem] min-h-[250px] border border-base-content/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-sm">
              {getCardsByStatus(status.id).map(card => (
                <div key={card.id} className="group relative">
                  <CardComponent 
                    card={card} 
                    onClick={() => !(showCreateModal || viewerCard || schedulingCard) && setViewerCard(card)} 
                    onStatusChange={(newStatusId) => handleStatusChange(card.id, newStatusId)}
                  />
                  {!(showCreateModal || viewerCard || schedulingCard) && (
                    <div className="mt-3 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 justify-center absolute -bottom-2 left-2 right-2 translate-y-full z-20 bg-base-100/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-base-content/10 scale-95 group-hover:scale-100">
                      {status.category === 'maybe' && (
                        <button 
                          onClick={() => handleSchedule(card)}
                          className="btn btn-xs btn-primary btn-outline gap-1 rounded-lg font-black text-[9px] uppercase tracking-wider"
                        >
                          ⚡ Schedule Now
                        </button>
                      )}
                      <div className="w-full h-px bg-base-content/5 my-1"></div>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {statuses.filter(s => s.id !== status.id).map(s => (
                          <button 
                            key={s.id}
                            onClick={() => handleStatusChange(card.id, s.id)}
                            className="btn btn-xs btn-ghost text-[9px] uppercase font-bold tracking-tight hover:bg-primary hover:text-white rounded-lg px-2"
                          >
                            → {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {status.category === 'maybe' && (
                <button 
                  disabled={!!(showCreateModal || viewerCard || schedulingCard)}
                  onClick={() => {
                    setSelectedStatusId(status.id);
                    setShowCreateModal(true);
                  }} 
                  className="btn btn-ghost btn-sm py-8 opacity-20 hover:opacity-100 border-dashed border-2 border-base-content/20 rounded-3xl group flex flex-col gap-1 disabled:opacity-5"
                >
                  <span className="text-xl group-hover:scale-125 transition-transform">+</span>
                  <span className="text-[10px] uppercase font-black tracking-widest">New Card</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {schedulingCard && (
        <SchedulePickerModal 
          card={schedulingCard}
          onClose={() => setSchedulingCard(null)}
          onScheduled={onCardScheduled}
        />
      )}
      {viewerCard && (
        <CardDetailModal 
          card={viewerCard}
          statuses={statuses}
          allCards={cards}
          onClose={() => setViewerCard(null)}
          onUpdated={async () => { fetchData(); }}
          onDeleted={fetchData}
        />
      )}
    </div>
  );
};
