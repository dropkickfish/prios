import { useState, useEffect } from 'react';
import type { BoardType, StatusType, CardType } from '../../types';
import { apiClient } from '../../api/client';
import { CardComponent } from '../../components/CardComponent';
import { CreateCardModal } from './CreateCardModal';
import { SchedulePickerModal } from './SchedulePickerModal';
import { CardDetailModal } from './CardDetailModal';
import { BoardSettingsModal } from './BoardSettingsModal';

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const fetchData = async () => {
    const [boards, boardStatuses, boardCards] = await Promise.all([
      apiClient.getBoards(),
      apiClient.getStatuses(boardId),
      apiClient.getCards(boardId),
    ]);
    
    // Ensure we refresh the board data to get latest colour/schedule
    // Since getBoards() returns all boards, we find ours
    const currentBoard = boards.find((b: any) => b.id === boardId);
    setBoard(currentBoard || null);
    setStatuses(boardStatuses);
    setCards(boardCards);
    setLoading(false);
  };
  
  // Re-fetch when showSettingsModal closes to update UI with new colour
  const handleSettingsClose = () => {
    setShowSettingsModal(false);
    fetchData(); 
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
      {showSettingsModal && board && (
        <BoardSettingsModal
          board={board}
          onClose={handleSettingsClose}
          onUpdated={(updatedBoard) => {
            setBoard(updatedBoard);
            handleSettingsClose();
          }}
        />
      )}
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
          <h1 className={`text-4xl font-black text-${board.colour || 'base-content'} tracking-tight`}>{board.name}</h1>
          <div className="flex items-center gap-2 opacity-50 text-xs font-bold uppercase tracking-widest mt-1">
            <span className={`w-2 h-2 rounded-full animate-pulse bg-${board.colour || 'primary'}`}></span>
            Mission Control
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSettingsModal(true)} className="btn btn-ghost btn-circle btn-sm">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
               <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          </button>
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
