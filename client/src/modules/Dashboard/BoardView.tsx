import { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  closestCorners,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { BoardType, StatusType, CardType } from '../../types';
import { apiClient } from '../../api/client';
import { CardComponent } from '../../components/CardComponent';
import { CreateCardModal } from './CreateCardModal';
import { SchedulePickerModal } from './SchedulePickerModal';
import { CardDetailModal } from './CardDetailModal';
import { BoardSettingsModal } from './BoardSettingsModal';
import { BoardSwitcher } from './BoardSwitcher';
import { FilterBar } from './FilterBar';
import { useShortcut } from '../../context/KeyboardContext';

interface BoardViewProps {
  boardId: string;
  onBack: () => void;
  onOpenPrioritise: () => void;
  onSwitchBoard: (boardId: string) => void;
}

interface DraggableCardProps {
  card: CardType;
  children: React.ReactNode;
}

const DraggableCard = ({ card, children }: DraggableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`${isDragging ? 'opacity-30' : ''} touch-none`}>
      {children}
    </div>
  );
};

interface DroppableColumnProps {
  statusId: string;
  isCollapsed?: boolean;
  children: React.ReactNode;
}

const DroppableColumn = ({ statusId, children }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: statusId,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col gap-3 p-2 bg-base-200/30 rounded-[1.5rem] min-h-[250px] border transition-colors shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-sm ${isOver ? 'border-primary/50 bg-primary/5' : 'border-base-content/5'}`}
    >
      {children}
    </div>
  );
};

export const BoardView = ({ boardId, onBack, onOpenPrioritise, onSwitchBoard }: BoardViewProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require movement of 8px to start drag (prevents accidental drags on click)
      },
    })
  );

  const [dragCard, setDragCard] = useState<CardType | null>(null);
  
  const handleDragStart = (event: DragStartEvent) => {
     setDragCard(event.active.data.current?.card || null);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDragCard(null);

    if (!over) return;

    const cardId = active.id as string;
    const newStatusId = over.id as string;
    
    // Find the card to check if status actually changed
    const card = cards.find(c => c.id === cardId);
    if (card && card.statusId !== newStatusId) {
      handleStatusChange(cardId, newStatusId);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [schedulingCard, setSchedulingCard] = useState<CardType | null>(null);
  const [viewerCard, setViewerCard] = useState<CardType | null>(null);
  const [board, setBoard] = useState<BoardType | null>(null);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>(['scheduled', 'done', 'wontdo']);
  const [filterText, setFilterText] = useState('');

  // Shortcuts
  useShortcut('board_prioritise', onOpenPrioritise);

  useShortcut('new_card', () => {
    // Only if we have a 'maybe' status to add to
    const firstMaybe = statuses.find(s => s.category === 'maybe');
    if (firstMaybe && !showCreateModal && !viewerCard && !schedulingCard) {
      setSelectedStatusId(firstMaybe.id);
      setShowCreateModal(true);
    }
  });

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

    // Non-blocking sync
    apiClient.syncCalendar()
      .then((result) => {
         if (result.synced > 0 || result.moved > 0 || result.deleted > 0) {
             console.log("Sync detected changes, refreshing...");
             // Refresh only cards
             apiClient.getCards(boardId).then((newCards) => {
                 setCards(newCards);
                 // If a card is open in viewer, refresh it too
                 if (viewerCard) {
                     const updatedViewerCard = newCards.find((c: any) => c.id === viewerCard.id);
                     if (updatedViewerCard) setViewerCard(updatedViewerCard);
                 }
             });
         }
      })
      .catch(err => console.error("Sync failed", err));
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
      
      // Trigger sync logic if moved (optimistic or separate call? User asked for "when moved")
      // We can just trigger the sync check in background
      apiClient.syncCalendar().then(() => fetchData()).catch(err => console.error("Sync failed", err));

      // Refresh cards
      const boardCards = await apiClient.getCards(boardId);
      setCards(boardCards);

      // Check if moved to Done
      const newStatus = statuses.find(s => s.id === newStatusId);
      if (newStatus?.category === 'done') {
         // Small delay to let the animation finish or user register the move
         setTimeout(() => {
           if (window.confirm("Great job! Want to triage your backlog now?")) {
             onOpenPrioritise();
           }
         }, 500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleSchedule = (card: CardType) => {
    setSchedulingCard(card);
  };

  const onCardScheduled = () => {
    setSchedulingCard(null);
    fetchData(); 
  };

  const getCardsByStatus = (statusId: string) => {
    return cards.filter(card => {
       const matchesStatus = card.statusId === statusId;
       const matchesFilter = filterText === '' || 
         card.title.toLowerCase().includes(filterText.toLowerCase()) ||
         (typeof card.description === 'string' && card.description.toLowerCase().includes(filterText.toLowerCase()));
       return matchesStatus && matchesFilter;
    });
  };

  const toggleColumn = (category: string) => {
    setCollapsedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Define column order explicitly
  const getCategoryOrder = (category: string) => {
    switch (category) {
      case 'maybe': return 1;
      case 'doing': return 2;
      case 'scheduled': return 3;
      case 'done': return 4;
      default: return 99;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!board) return <div>Board not found.</div>;

  const sortedStatuses = [...statuses].sort((a, b) => {
     const orderA = getCategoryOrder(a.category);
     const orderB = getCategoryOrder(b.category);
     if (orderA !== orderB) return orderA - orderB;
     return a.order - b.order;
  });

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
          <BoardSwitcher 
             currentBoard={board} 
             onSwitch={onSwitchBoard} 
          />
          <div className="flex items-center gap-2 opacity-50 text-xs font-bold uppercase tracking-widest mt-1">
            <span className={`w-2 h-2 rounded-full animate-pulse bg-${board.colour || 'primary'}`}></span>
            Mission Control
          </div>
        </div>
        
        <div className="flex-1 flex justify-center px-8">
           <FilterBar onFilterChange={setFilterText} />
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

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div className="flex overflow-x-auto gap-8 px-4 pb-12 min-h-[75vh] items-start scrollbar-hide justify-center">
        {sortedStatuses.map(status => {
          const isCollapsed = collapsedCategories.includes(status.category);
          return (
            <div key={status.id} className={`flex-shrink-0 flex flex-col gap-6 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'}`}>
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                   <div className={`w-2 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform ${
                     status.category === 'doing' ? 'bg-primary' : 
                     status.category === 'scheduled' ? 'bg-secondary' : 
                     status.category === 'done' ? 'bg-success' : 
                     status.category === 'maybe' ? 'bg-info' : 'bg-base-content/20'
                   }`} onClick={() => toggleColumn(status.category)}></div>
                   
                   {!isCollapsed && (
                     <>
                      <h2 className="text-xs font-black uppercase tracking-[0.2em] opacity-50">{status.name}</h2>
                      <span className="badge badge-sm badge-ghost font-bold opacity-30">{getCardsByStatus(status.id).length}</span>
                      
                      {status.category === 'maybe' && (
                        <button 
                          onClick={onOpenPrioritise}
                          className="ml-auto btn btn-xs btn-circle btn-ghost opacity-50 hover:opacity-100"
                          title="Open Triage Mode"
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                           </svg>
                        </button>
                      )}
                     </>
                   )}
                </div>
                {!isCollapsed && (
                   <button onClick={() => toggleColumn(status.category)} className="btn btn-xs btn-ghost btn-circle opacity-0 group-hover:opacity-30">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                     </svg>
                   </button>
                )}
              </div>
              
              {isCollapsed ? (
                 <div 
                   onClick={() => toggleColumn(status.category)}
                   className="h-full min-h-[250px] bg-base-200/50 rounded-full flex flex-col items-center py-4 gap-4 cursor-pointer hover:bg-base-200 transition-colors border border-transparent hover:border-base-content/10"
                 >
                    <span className="text-xs font-black opacity-30 rotate-180" style={{ writingMode: 'vertical-rl' }}>{status.name}</span>
                    <span className="badge badge-sm badge-ghost font-bold">{getCardsByStatus(status.id).length}</span>
                 </div>
              ) : (
                <DroppableColumn statusId={status.id}>
                  {getCardsByStatus(status.id).map(card => (
                    <DraggableCard key={card.id} card={card}>
                      <CardComponent 
                        card={card} 
                        statuses={statuses}
                        showActions={true}
                        onClick={() => !(showCreateModal || viewerCard || schedulingCard) && setViewerCard(card)} 
                        onStatusChange={(newStatusId) => handleStatusChange(card.id, newStatusId)}
                        onSchedule={handleSchedule}
                      />
                    </DraggableCard>
                  ))}
                  {status.category === 'maybe' && (
                    <button 
                      disabled={!!(showCreateModal || viewerCard || schedulingCard)}
                      onClick={() => {
                        setSelectedStatusId(status.id);
                        setShowCreateModal(true);
                      }} 
                      className="btn btn-ghost btn-sm py-4 opacity-40 hover:opacity-100 border-dashed border-2 border-base-content/20 rounded-xl group flex gap-2 disabled:opacity-5 w-full"
                    >
                      <span className="text-lg group-hover:scale-125 transition-transform">+</span>
                      <span className="text-[10px] uppercase font-black tracking-widest">Add Task</span>
                    </button>
                  )}
                </DroppableColumn>
              )}
            </div>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
         {dragCard ? (
            <div className="rotate-3 scale-105 pointer-events-none">
                <CardComponent card={dragCard} showActions={false} />
            </div>
         ) : null}
      </DragOverlay>
      </DndContext>
      {schedulingCard && (
        <SchedulePickerModal 
          card={schedulingCard}
          schedulingWindowDays={board?.schedulingWindowDays || 3}
          onClose={() => setSchedulingCard(null)}
          onScheduled={onCardScheduled}
        />
      )}
      {viewerCard && (
        <CardDetailModal 
          card={viewerCard}
          board={board}
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
