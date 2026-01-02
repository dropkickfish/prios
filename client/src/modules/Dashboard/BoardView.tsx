import { useState, useEffect } from 'react';
import type { BoardType, StatusType, CardType } from '../../types';
import { apiClient } from '../../api/client';
import { CardComponent } from '../../components/CardComponent';

interface BoardViewProps {
  boardId: string;
  onBack: () => void;
}

export const BoardView = ({ boardId, onBack }: BoardViewProps) => {
  const [board, setBoard] = useState<BoardType | null>(null);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchData();
  }, [boardId]);

  const handleCardClick = (cardId: string) => {
    console.log('Card clicked:', cardId);
  };

  const handleStatusChange = async (cardId: string, newStatusId: string) => {
    try {
      await apiClient.updateCardStatus(cardId, newStatusId);
      // Refresh cards
      const boardCards = await apiClient.getCards(boardId);
      setCards(boardCards);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-base-content">{board.name}</h1>
          <p className="opacity-60 text-sm">Kanban Board View</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="btn btn-ghost btn-sm">Back</button>
          <button className="btn btn-primary btn-sm text-white">Add Card</button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-6 min-h-[70vh] items-start">
        {statuses.map(status => (
          <div key={status.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-2">
                 <h2 className="text-sm font-black uppercase tracking-widest opacity-40">{status.name}</h2>
                 <span className="badge badge-ghost badge-xs opacity-30">{getCardsByStatus(status.id).length}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 p-4 bg-base-300/20 rounded-3xl min-h-[200px] border border-base-content/5 shadow-inner">
              {getCardsByStatus(status.id).map(card => (
                <div key={card.id} className="group relative">
                  <CardComponent 
                    card={card} 
                    onClick={handleCardClick}
                  />
                  <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-center absolute -bottom-1 left-0 right-0 translate-y-full z-10 bg-base-100 p-2 rounded-xl shadow-lg border border-base-200">
                    {statuses.filter(s => s.id !== status.id).map(s => (
                      <button 
                        key={s.id}
                        onClick={() => handleStatusChange(card.id, s.id)}
                        className="btn btn-xs btn-ghost text-[8px] uppercase font-black tracking-tighter"
                        title={`Move to ${s.name}`}
                      >
                        → {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm opacity-20 hover:opacity-100 border-dashed border-2 rounded-2xl">+ New Card</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
