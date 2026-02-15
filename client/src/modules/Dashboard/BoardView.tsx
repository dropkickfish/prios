import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ScheduleTimeStrip } from './ScheduleTimeStrip';
import { QuickCaptureBar } from './QuickCaptureBar';
import { CommandBar } from './CommandBar';
import { useShortcut, useKeyboard } from '../../context/KeyboardContext';

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
  className?: string;
}

const DroppableColumn = ({ statusId, children, className = '' }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: statusId,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex flex-col gap-3 p-2 bg-base-200/30 rounded-[1.5rem] min-h-[250px] border transition-colors shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-sm ${isOver ? 'border-primary/50 bg-primary/5' : 'border-base-content/5'} ${className}`}
    >
      {children}
    </div>
  );
};

export const BoardView = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
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
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>(['maybe', 'scheduled', 'done', 'wontdo']);
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [focusConflict, setFocusConflict] = useState<{ cardToMove: CardType; currentDoing: CardType } | null>(null);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showQuickAddBar, setShowQuickAddBar] = useState(false);
  const { shortcuts } = useKeyboard();

  const openQuickAdd = () => {
    const firstMaybe = statuses.find(s => s.category === 'maybe');
    if (!firstMaybe || showCreateModal || viewerCard || schedulingCard) return;
    setSelectedStatusId(firstMaybe.id);
    setShowCreateModal(true);
    setShowQuickAddBar(true);
  };

  // Shortcuts
  useShortcut('board_prioritise', () => navigate(`/boards/${boardId}/prioritise`));
  useShortcut('filter', () => setShowFilter(true));

  useEffect(() => {
    const handleSlash = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      e.preventDefault();
      setShowCommandBar(true);
    };
    window.addEventListener('keydown', handleSlash);
    return () => window.removeEventListener('keydown', handleSlash);
  }, []);

  useShortcut('new_card', () => {
    const firstMaybe = statuses.find(s => s.category === 'maybe');
    if (firstMaybe && !showCreateModal && !viewerCard && !schedulingCard) {
      setSelectedStatusId(firstMaybe.id);
      setShowCreateModal(true);
      setShowQuickAddBar(true);
    }
  });

  const fetchData = async () => {
    if (!boardId) return;

    const [boards, boardStatuses, boardCards] = await Promise.all([
      apiClient.getBoards(),
      apiClient.getStatuses(boardId),
      apiClient.getCards(boardId),
    ]);
    
    // Ensure we refresh the board data to get latest colour/schedule
    // Since getBoards() returns all boards, we find ours
    const currentBoard = boards.find((b: any) => b.id === boardId);
    
    if (!currentBoard) {
      navigate('/');
      return; 
    }

    setBoard(currentBoard || null);
    setStatuses(boardStatuses);
    setCards(boardCards);
    
    // Refresh viewer card if open
    if (viewerCard) {
      const updatedViewerCard = boardCards.find((c: CardType) => c.id === viewerCard.id);
      if (updatedViewerCard) setViewerCard(updatedViewerCard);
    }

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
    if (!boardId) return;
    const newStatus = statuses.find(s => s.id === newStatusId);
    const doingStatus = statuses.find(s => s.category === 'doing');
    const isMovingToDoing = doingStatus && newStatusId === doingStatus.id;
    const currentDoingCard = isMovingToDoing ? cards.find(c => c.statusId === doingStatus.id) : null;

    if (isMovingToDoing && currentDoingCard && currentDoingCard.id !== cardId) {
      const cardToMove = cards.find(c => c.id === cardId);
      if (cardToMove) setFocusConflict({ cardToMove, currentDoing: currentDoingCard });
      return;
    }

    try {
      await apiClient.updateCard(cardId, { statusId: newStatusId });
      apiClient.syncCalendar().then(() => fetchData()).catch(err => console.error("Sync failed", err));
      const boardCards = await apiClient.getCards(boardId);
      setCards(boardCards);

      if (newStatus?.category === 'done') {
        setTimeout(() => {
          if (window.confirm("Great job! Want to triage your backlog now?")) {
            navigate(`/boards/${boardId}/prioritise`);
          }
        }, 500);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const resolveFocusConflict = async (action: 'done' | 'later') => {
    if (!boardId || !focusConflict) return;
    const doingStatus = statuses.find(s => s.category === 'doing');
    const doneStatus = statuses.find(s => s.category === 'done');
    const maybeStatus = statuses.find(s => s.category === 'maybe');
    if (!doingStatus || (action === 'done' && !doneStatus) || (action === 'later' && !maybeStatus)) return;
    try {
      const targetStatusId = action === 'done' ? doneStatus!.id : maybeStatus!.id;
      await apiClient.updateCard(focusConflict.currentDoing.id, { statusId: targetStatusId });
      await apiClient.updateCard(focusConflict.cardToMove.id, { statusId: doingStatus.id });
      setFocusConflict(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const focusConflictDesc = (card: CardType) => {
    if (!card.description) return '';
    const raw = typeof card.description === 'string'
      ? card.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : (card.description as { content?: Array<{ content?: Array<{ text?: string }> }> })?.content?.flatMap(n => (n.content ?? []).map(c => c.text ?? '')).join(' ') ?? '';
    return raw.slice(0, 140) + (raw.length > 140 ? '…' : '');
  };

  const handleSchedule = (card: CardType) => {
    setSchedulingCard(card);
  };

  const onCardScheduled = () => {
    setSchedulingCard(null);
    fetchData(); 
  };

  const getCardsByStatus = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    const filtered = cards.filter(card => {
       const matchesStatus = card.statusId === statusId;
       const matchesFilter = filterText === '' || 
         card.title.toLowerCase().includes(filterText.toLowerCase()) ||
         (typeof card.description === 'string' && card.description.toLowerCase().includes(filterText.toLowerCase()));
       return matchesStatus && matchesFilter;
    });

    if (status?.category === 'maybe') {
      return [...filtered].sort((a, b) => (b.smartScore || 0) - (a.smartScore || 0));
    }
    return filtered;
  };

  const statusDisplayName = (status: StatusType) => {
    if (status.category === 'maybe') return 'To do';
    if (status.category === 'doing') return 'FOCUS';
    return status.name;
  };

  const toggleColumn = (category: string) => {
    setCollapsedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleSection = (section: 'backlog' | 'archive') => {
    const categories = section === 'backlog' ? ['maybe', 'scheduled'] : ['done', 'wontdo'];
    const otherCategories = section === 'backlog' ? ['done', 'wontdo'] : ['maybe', 'scheduled'];
    const allCollapsed = categories.every(c => collapsedCategories.includes(c));
    if (allCollapsed) {
      setCollapsedCategories(prev => {
        const afterOpen = prev.filter(c => !categories.includes(c));
        return [...afterOpen.filter(c => !otherCategories.includes(c)), ...otherCategories];
      });
    } else {
      setCollapsedCategories(prev => [...prev, ...categories]);
    }
  };

  const doingStatus = statuses.find(s => s.category === 'doing');
  const scheduledStatus = statuses.find(s => s.category === 'scheduled');
  const backlogCollapsed = collapsedCategories.includes('maybe') && collapsedCategories.includes('scheduled');
  const archiveCollapsed = collapsedCategories.includes('done') && collapsedCategories.includes('wontdo');

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (!board) return <div>Board not found.</div>;

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-6">
      {showCommandBar && boardId && (
        <CommandBar
          isOpen={showCommandBar}
          onClose={() => setShowCommandBar(false)}
          onQuickAdd={async (title) => {
            const maybeStatus = statuses.find(s => s.category === 'maybe');
            if (!maybeStatus) return;
            await apiClient.createCard(boardId!, { title, statusId: maybeStatus.id, difficulty: 3, priority: 3 });
            const next = await apiClient.getCards(boardId!);
            setCards(next);
          }}
        />
      )}
      {focusConflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-base-content/30 backdrop-blur-sm" onClick={() => setFocusConflict(null)} role="dialog" aria-modal="true">
          <div className="bg-base-100 border border-base-content/10 shadow-2xl rounded-2xl p-4 sm:p-5 max-w-md w-full max-h-[90vh] flex flex-col min-h-0" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-base sm:text-lg shrink-0">FOCUS slot is in use</h3>
            <p className="text-xs sm:text-sm opacity-80 shrink-0 mt-1">
              Mark the current task done or move to Backlog so this task can take its place.
            </p>
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-y-auto py-2">
              <div className="rounded-xl bg-base-200/60 p-3 border border-base-content/10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Currently in focus</p>
                <p className="font-bold text-sm mt-0.5 line-clamp-1">{focusConflict.currentDoing.title}</p>
                {focusConflictDesc(focusConflict.currentDoing) && (
                  <p className="text-xs opacity-70 mt-1 line-clamp-2">{focusConflictDesc(focusConflict.currentDoing)}</p>
                )}
              </div>
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Task to move here</p>
                <p className="font-bold text-sm mt-0.5 line-clamp-1">{focusConflict.cardToMove.title}</p>
                {focusConflictDesc(focusConflict.cardToMove) && (
                  <p className="text-xs opacity-70 mt-1 line-clamp-2">{focusConflictDesc(focusConflict.cardToMove)}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 pt-2">
              <button type="button" className="btn btn-primary w-full btn-sm sm:btn-md" onClick={() => resolveFocusConflict('done')}>
                Mark done, then move this here
              </button>
              <button type="button" className="btn btn-ghost border border-base-content/20 w-full btn-sm sm:btn-md" onClick={() => resolveFocusConflict('later')}>
                Move to Backlog, then move this here
              </button>
              <button type="button" className="btn btn-ghost btn-sm w-full opacity-60" onClick={() => setFocusConflict(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
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
      {showCreateModal && boardId && (
        <CreateCardModal 
          boardId={boardId} 
          statuses={statuses} 
          existingCards={cards}
          initialStatusId={selectedStatusId}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedStatusId(null);
            setShowQuickAddBar(false);
          }}
          onCreated={() => {
             apiClient.getCards(boardId).then(setCards);
          }}
        />
      )}
      <div className="space-y-3 px-4 sm:px-6">
        <div className="flex flex-wrap justify-between items-start gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <BoardSwitcher currentBoard={board} onSwitch={(id) => navigate(`/boards/${id}`)} />
              <button onClick={() => setShowSettingsModal(true)} className="btn btn-ghost btn-circle btn-sm shrink-0" title="Board settings">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 opacity-50 text-xs font-bold uppercase tracking-widest mt-1">
              <span className={`w-2 h-2 rounded-full animate-pulse bg-${board.colour || 'primary'}`}></span>
              Mission Control
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end min-w-0 ml-auto">
            {showFilter || filterText ? (
              <FilterBar
                value={filterText}
                onFilterChange={setFilterText}
                onClose={() => setShowFilter(false)}
                focusOnOpen={showFilter}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowFilter(true)}
                className="btn btn-ghost btn-sm rounded-full gap-2 opacity-70 hover:opacity-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
                Filter [{shortcuts.filter.key.toUpperCase()}]
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col min-w-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-4 px-4 sm:px-6 pb-12 min-h-0">
        {/* Scheduled: expandable calendar at top (all breakpoints; desktop defaults expanded) */}
        <ScheduleTimeStrip
            cards={cards}
            scheduledStatusId={scheduledStatus?.id ?? null}
            filterText={filterText}
            onCardClick={(card) => !(showCreateModal || viewerCard || schedulingCard) && setViewerCard(card)}
        />

        <div className="flex flex-col gap-4 min-h-[50vh] items-stretch">
          {/* Backlog: expandable — order-2, always stacked */}
          {(() => {
            const maybeStatus = statuses.find(s => s.category === 'maybe');
            const schedStatus = statuses.find(s => s.category === 'scheduled');
            const backlogStatuses = [maybeStatus, schedStatus].filter(Boolean) as StatusType[];
            const backlogCount = backlogStatuses.reduce((sum, s) => sum + getCardsByStatus(s.id).length, 0);
            return (
              <div className={`order-2 flex-shrink-0 flex flex-col gap-4 transition-all duration-300 w-full ${backlogCollapsed ? '' : ''}`}>
                {backlogCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection('backlog')}
                    className="w-full min-h-[56px] rounded-2xl bg-base-200/60 border border-base-content/10 flex flex-row items-center justify-center gap-2 py-3 lg:py-4 hover:bg-base-200 transition-colors"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Backlog</span>
                    <span className="badge badge-sm badge-ghost font-bold">{backlogCount}</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-4 w-full min-w-0">
                    {/* Section header: symmetrical, collapse centred */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full px-1">
                      <div className="flex items-center gap-2 justify-start min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Backlog</span>
                        <span className="badge badge-sm badge-ghost font-bold">{backlogCount}</span>
                      </div>
                      <button type="button" onClick={() => toggleSection('backlog')} className="btn btn-ghost btn-xs gap-1.5 opacity-60 hover:opacity-100 justify-self-center" aria-label="Collapse backlog">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        <span className="text-[10px] uppercase">Collapse</span>
                      </button>
                      <div className="flex items-center justify-end min-w-0">
                        <button type="button" onClick={() => navigate(`/boards/${boardId}/prioritise`)} className="btn btn-xs btn-ghost gap-1.5 opacity-70 hover:opacity-100 shrink-0" title="Prioritise backlog (tinder-style swipe)">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                          <span className="text-[10px] font-bold uppercase hidden sm:inline">Prioritise</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full min-w-0">
                    {backlogStatuses.map(status => {
                      const isCollapsed = collapsedCategories.includes(status.category);
                      return (
                        <div key={status.id} className="flex flex-col gap-3 flex-shrink-0 transition-all w-full min-w-0">
                          <div className="flex items-center justify-between gap-2 px-1 w-full">
                            <button type="button" onClick={() => toggleColumn(status.category)} className="btn btn-ghost btn-xs gap-2 p-1 text-left min-w-0">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{statusDisplayName(status)}</span>
                              <span className="badge badge-ghost badge-sm font-bold">{getCardsByStatus(status.id).length}</span>
                            </button>
                            <button type="button" onClick={() => toggleColumn(status.category)} className="btn btn-ghost btn-circle btn-xs opacity-50 hover:opacity-100 shrink-0" aria-label={`Collapse ${statusDisplayName(status)}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                          </div>
                          {!isCollapsed && (
                            <DroppableColumn statusId={status.id}>
                              {getCardsByStatus(status.id).map(card => (
                                <DraggableCard key={card.id} card={card}>
                                  <CardComponent
                                    card={card}
                                    statuses={statuses}
                                    variant="backlog"
                                    showActions={true}
                                    onClick={() => !(showCreateModal || viewerCard || schedulingCard) && setViewerCard(card)}
                                    onStatusChange={(_, newStatusId) => handleStatusChange(card.id, newStatusId)}
                                    onSchedule={handleSchedule}
                                  />
                                </DraggableCard>
                              ))}
                              {status.category === 'maybe' && (
                                <button disabled={!!(showCreateModal || viewerCard || schedulingCard)} onClick={() => { setSelectedStatusId(status.id); setShowCreateModal(true); }}
                                  className="btn btn-ghost btn-sm py-3 opacity-40 hover:opacity-100 border-dashed border-2 border-base-content/20 rounded-xl w-full text-[10px] uppercase font-black">+ Add</button>
                              )}
                            </DroppableColumn>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* FOCUS: always visible at top — order-1 */}
          {doingStatus && (
            <div className="order-1 flex-1 min-w-0 flex flex-col gap-3 px-2 w-full">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-8 rounded-full bg-primary shadow-lg shadow-primary/30" />
                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-primary">FOCUS</h2>
                <span className="badge badge-primary badge-sm font-bold" title="One task at a time — swap or finish current to add another">1 slot</span>
                <span className="text-[10px] uppercase tracking-widest opacity-40 hidden sm:inline">One at a time</span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col max-h-[42vh] md:max-h-none">
                <DroppableColumn statusId={doingStatus.id} className="flex-1 min-h-0 overflow-hidden">
                  <div className="min-h-0 flex-1 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 flex flex-col overflow-hidden">
                    {getCardsByStatus(doingStatus.id).map(card => (
                      <div key={card.id} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <DraggableCard card={card}>
                          <CardComponent
                            card={card}
                            statuses={statuses}
                            showActions={true}
                            constrainDescriptionOnMobile
                            onClick={() => !(showCreateModal || viewerCard || schedulingCard) && setViewerCard(card)}
                            onStatusChange={(_, newStatusId) => handleStatusChange(card.id, newStatusId)}
                            onSchedule={handleSchedule}
                          />
                        </DraggableCard>
                      </div>
                    ))}
                    {getCardsByStatus(doingStatus.id).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-50 flex-1">
                        <p className="text-sm font-bold uppercase tracking-widest">No focus task</p>
                        <p className="text-xs mt-1">Move one from Backlog or start triage</p>
                        <button type="button" onClick={() => navigate(`/boards/${boardId}/prioritise`)} className="btn btn-primary btn-sm mt-4">Triage Backlog</button>
                      </div>
                    )}
                  </div>
                </DroppableColumn>
              </div>
            </div>
          )}

          {/* Archive: expandable — order-3, always stacked */}
          {(() => {
            const doneStatus = statuses.find(s => s.category === 'done');
            const wontdoStatus = statuses.find(s => s.category === 'wontdo');
            const archiveStatuses = [doneStatus, wontdoStatus].filter(Boolean) as StatusType[];
            const archiveCount = archiveStatuses.reduce((sum, s) => sum + getCardsByStatus(s.id).length, 0);
            return (
              <div className="order-3 flex-shrink-0 flex flex-col gap-4 transition-all duration-300 w-full">
                {archiveCollapsed ? (
                  <button type="button" onClick={() => toggleSection('archive')}
                    className="w-full min-h-[56px] rounded-2xl bg-base-200/60 border border-base-content/10 flex flex-row items-center justify-center gap-2 py-3 lg:py-4 hover:bg-base-200 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Archive</span>
                    <span className="badge badge-sm badge-ghost font-bold">{archiveCount}</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-4 w-full min-w-0">
                    {/* Section header: symmetrical, collapse centred */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full px-1">
                      <div className="flex items-center gap-2 justify-start min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Archive</span>
                        <span className="badge badge-sm badge-ghost font-bold">{archiveCount}</span>
                      </div>
                      <button type="button" onClick={() => toggleSection('archive')} className="btn btn-ghost btn-xs gap-1.5 opacity-60 hover:opacity-100 justify-self-center" aria-label="Collapse archive">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        <span className="text-[10px] uppercase">Collapse</span>
                      </button>
                      <div className="min-w-0" aria-hidden />
                    </div>
                    <div className="flex flex-col gap-4 w-full min-w-0">
                    {archiveStatuses.map(status => {
                      const isCollapsed = collapsedCategories.includes(status.category);
                      return (
                        <div key={status.id} className="flex flex-col gap-3 flex-shrink-0 transition-all w-full min-w-0">
                          <div className="flex items-center justify-between gap-2 px-1 w-full">
                            <button type="button" onClick={() => toggleColumn(status.category)} className="btn btn-ghost btn-xs gap-2 p-1 text-left min-w-0">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{status.name}</span>
                              <span className="badge badge-ghost badge-sm font-bold">{getCardsByStatus(status.id).length}</span>
                            </button>
                            <button type="button" onClick={() => toggleColumn(status.category)} className="btn btn-ghost btn-circle btn-xs opacity-50 hover:opacity-100 shrink-0" aria-label={`Collapse ${status.name}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                          </div>
                          {!isCollapsed && (
                            <DroppableColumn statusId={status.id}>
                              {getCardsByStatus(status.id).map(card => (
                                <DraggableCard key={card.id} card={card}>
                                  <CardComponent card={card} statuses={statuses} showActions={true}
                                    onClick={() => !(showCreateModal || viewerCard || schedulingCard) && setViewerCard(card)}
                                    onStatusChange={(_, newStatusId) => handleStatusChange(card.id, newStatusId)}
                                    onSchedule={handleSchedule} />
                                </DraggableCard>
                              ))}
                            </DroppableColumn>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        </div>
        </div>
      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
         {dragCard ? (
            <div className="rotate-3 scale-105 pointer-events-none">
                <CardComponent card={dragCard} showActions={false} />
            </div>
         ) : null}
      </DragOverlay>
      </DndContext>
      </div>
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
          variant="modal"
        />
      )}
      {board && statuses.length > 0 && statuses.some(s => s.category === 'maybe') && (
        <>
          {/* + button: always visible when quick-add bar is closed (mobile + desktop) */}
          {!showQuickAddBar && (
            <div className="fixed bottom-4 right-4 z-30 md:bottom-6 md:right-6">
              <button
                type="button"
                onClick={openQuickAdd}
                className="btn btn-primary btn-circle shadow-lg shadow-primary/30 w-14 h-14 md:w-16 md:h-16 text-2xl border-0"
                title={`New card (${shortcuts.new_card?.key ? shortcuts.new_card.key.toUpperCase() : 'N'})`}
              >
                +
              </button>
            </div>
          )}
          {/* Slide-up "What needs doing" panel — visible when + clicked or new_card shortcut */}
          <div
            className={`fixed left-0 right-0 bottom-0 z-30 bg-base-100/95 backdrop-blur-md border-t border-base-content/10 transition-transform duration-300 ease-out ${
              showQuickAddBar ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="px-4 py-4 max-w-xl mx-auto">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">What needs doing?</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddBar(false);
                    setShowCreateModal(false);
                    setSelectedStatusId(null);
                  }}
                  className="btn btn-ghost btn-circle btn-sm"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <QuickCaptureBar
                placeholder="What needs doing?"
                backlogCount={cards.filter(c => statuses.find(s => s.id === c.statusId)?.category === 'maybe').length}
                disabled={!!(viewerCard || schedulingCard)}
                onSubmit={async (title) => {
                  const maybeStatus = statuses.find(s => s.category === 'maybe');
                  if (!boardId || !maybeStatus) return;
                  await apiClient.createCard(boardId, {
                    title,
                    statusId: maybeStatus.id,
                    difficulty: 3,
                    priority: 3,
                  });
                  const next = await apiClient.getCards(boardId);
                  setCards(next);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
