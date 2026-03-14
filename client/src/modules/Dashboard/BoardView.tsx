import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { BoardType, StatusType, CardType } from '../../types';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
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
import { DraggableCard, DroppableColumn } from './BoardViewParts';
import { BacklogSection } from './BacklogSection';
import { ArchiveSection } from './ArchiveSection';

const BOARD_STATUS_DOT_CLASS: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  neutral: 'bg-neutral',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};


export const BoardView = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
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

    const card = cards.find(c => c.id === cardId);
    if (card && card.statusId !== newStatusId) {
      handleStatusChange(cardId, newStatusId);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [schedulingCard, setSchedulingCard] = useState<CardType | null>(null);
  // Store viewerCardId so the viewer stays in sync with the cached card data
  const [viewerCardId, setViewerCardId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>(['maybe', 'done', 'wontdo']);
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [focusConflict, setFocusConflict] = useState<{ cardToMove: CardType; currentDoing: CardType } | null>(null);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showQuickAddBar, setShowQuickAddBar] = useState(false);
  const [quickAddExpanded, setQuickAddExpanded] = useState(false);
  const [quickAddSession, setQuickAddSession] = useState(0);
  const [quickAddCollapseSignal, setQuickAddCollapseSignal] = useState(0);
  const [showTriagePrompt, setShowTriagePrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { shortcuts } = useKeyboard();
  const mountSyncBoardIdRef = useRef<string | null>(null);

  const { data: boards = [] } = useQuery<BoardType[]>({
    queryKey: queryKeys.boards(),
    queryFn: apiClient.getBoards,
  });

  const board = boards.find(b => b.id === boardId) ?? null;

  const { data: statuses = [], isLoading: statusesLoading } = useQuery<StatusType[]>({
    queryKey: queryKeys.statuses(boardId!),
    queryFn: () => apiClient.getStatuses(boardId!),
    enabled: !!boardId,
  });

  const { data: cards = [], isLoading: cardsLoading } = useQuery<CardType[]>({
    queryKey: queryKeys.cards(boardId!),
    queryFn: () => apiClient.getCards(boardId!),
    enabled: !!boardId,
  });

  const loading = statusesLoading || cardsLoading;

  // Derive viewer card from cached data so it auto-updates after mutations
  const viewerCard = viewerCardId ? cards.find(c => c.id === viewerCardId) ?? null : null;

  // Redirect if board not found (once boards have loaded)
  useEffect(() => {
    if (!boardId || boards.length === 0) return;
    if (!boards.find(b => b.id === boardId)) {
      navigate('/');
    }
  }, [boards, boardId, navigate]);

  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  const isCalendarSyncExpectedError = (err: unknown) => {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    return msg.includes('bad request') || msg.includes('not connected') || msg.includes('calendar');
  };

  const syncCalendarSafely = useCallback(async () => {
    if (!boardId) return;
    try {
      const result = await apiClient.syncCalendar();
      if (result.synced > 0 || result.moved > 0 || result.deleted > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId) });
      }
    } catch (err) {
      // Common when calendar integration is not connected/configured yet.
      if (!isCalendarSyncExpectedError(err)) {
        console.warn('Calendar sync failed', err);
      }
    }
  }, [boardId, queryClient]);

  // Non-blocking calendar sync on mount (once per board load)
  useEffect(() => {
    if (!boardId) return;
    if (mountSyncBoardIdRef.current === boardId) return;
    mountSyncBoardIdRef.current = boardId;
    syncCalendarSafely();
  }, [boardId, syncCalendarSafely]);

  const updateCardMutation = useMutation({
    mutationFn: ({ cardId, statusId }: { cardId: string; statusId: string }) =>
      apiClient.updateCard(cardId, { statusId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
      syncCalendarSafely();
    },
  });

  const openQuickAdd = () => {
    const firstMaybe = statuses.find(s => s.category === 'maybe');
    if (!firstMaybe || showCreateModal || viewerCard || schedulingCard) return;
    setSelectedStatusId(firstMaybe.id);
    setQuickAddExpanded(false);
    setQuickAddSession((session) => session + 1);
    setShowQuickAddBar(true);
  };

  const closeQuickAdd = useCallback(() => {
    const activeEl = document.activeElement as HTMLElement | null;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable)
    ) {
      activeEl.blur();
    }
    setShowQuickAddBar(false);
    setQuickAddExpanded(false);
    setSelectedStatusId(null);
  }, [setShowQuickAddBar, setQuickAddExpanded, setSelectedStatusId]);

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
      setQuickAddExpanded(false);
      setQuickAddSession((session) => session + 1);
      setShowQuickAddBar(true);
    }
  });

  useEffect(() => {
    if (!showQuickAddBar) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (quickAddExpanded) {
        setQuickAddExpanded(false);
        setQuickAddCollapseSignal((signal) => signal + 1);
        return;
      }
      closeQuickAdd();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showQuickAddBar, quickAddExpanded, closeQuickAdd]);

  useEffect(() => {
    if (loading || showQuickAddBar || showCreateModal || showCommandBar || viewerCard || schedulingCard) return;
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      activeEl.blur();
    }
  }, [loading, showQuickAddBar, showCreateModal, showCommandBar, viewerCard, schedulingCard]);

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
      await updateCardMutation.mutateAsync({ cardId, statusId: newStatusId });

      if (newStatus?.category === 'done') {
        setTimeout(() => setShowTriagePrompt(true), 500);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update status');
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
      queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId) });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update');
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
    queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
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

  const toggleColumn = (category: string) => {
    setCollapsedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleSection = (section: 'backlog' | 'archive') => {
    const categories = section === 'backlog' ? ['maybe'] : ['done', 'wontdo'];
    const otherCategories = section === 'backlog' ? ['done', 'wontdo'] : ['maybe'];
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
  const backlogCollapsed = collapsedCategories.includes('maybe');
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
            queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
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
      {showTriagePrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-base-content/30 backdrop-blur-sm" onClick={() => setShowTriagePrompt(false)}>
          <div className="bg-base-100 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-base-content/10" onClick={e => e.stopPropagation()}>
            <p className="text-lg font-black">Task complete!</p>
            <p className="text-sm opacity-70 mt-1">Want to triage your backlog now?</p>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary flex-1" onClick={() => { setShowTriagePrompt(false); navigate(`/boards/${boardId}/prioritise`); }}>
                Triage Backlog
              </button>
              <button className="btn btn-ghost flex-1 border border-base-content/20" onClick={() => setShowTriagePrompt(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] alert alert-error shadow-lg max-w-sm w-full" role="alert">
          <span className="text-sm flex-1">{errorMessage}</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}
      {showSettingsModal && board && (
        <BoardSettingsModal
          board={board}
          onClose={() => {
            setShowSettingsModal(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.boards() });
          }}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.boards() });
            setShowSettingsModal(false);
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
            queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId) });
          }}
        />
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-4 px-4 sm:px-6">
        <div className="border-b border-base-content/10 pb-4">
        <div className="flex flex-wrap justify-between items-start gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary/70 font-semibold mb-1">Execution board</p>
            <div className="flex items-center gap-2 flex-wrap">
              <BoardSwitcher currentBoard={board} onSwitch={(id) => navigate(`/boards/${id}`)} />
              <button onClick={() => setShowSettingsModal(true)} className="btn btn-ghost btn-sm h-10 min-h-10 rounded-lg px-2.5 shrink-0 text-base-content/70 hover:text-base-content" title="Board settings">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-base-200/70 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-base-content/75">
              <span className={`w-2 h-2 rounded-full ${BOARD_STATUS_DOT_CLASS[board.colour || 'primary'] || 'bg-primary'}`}></span>
              {doingStatus && getCardsByStatus(doingStatus.id).length > 0 ? '1 task in focus' : 'Focus slot empty'}
            </div>
          </div>
          <div className={`flex shrink-0 items-center justify-end min-w-0 ml-auto ${showFilter || filterText ? 'w-full sm:w-auto' : ''}`}>
            {showFilter || filterText ? (
              <div className="w-full sm:w-[22rem]">
                <FilterBar
                  value={filterText}
                  onFilterChange={setFilterText}
                  onClose={() => setShowFilter(false)}
                  focusOnOpen={showFilter}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowFilter(true)}
                className="btn btn-ghost btn-sm h-11 min-h-11 rounded-full gap-2 opacity-80 hover:opacity-100 px-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
                <span>Filter</span>
                <span className="hidden md:inline-flex items-center gap-1 opacity-70">
                  <kbd className="kbd kbd-xs">{shortcuts.filter?.key?.toUpperCase() ?? 'F'}</kbd>
                </span>
              </button>
            )}
          </div>
        </div>
        </div>

      <div className="flex-1 min-h-0 flex flex-col min-w-0 rounded-2xl border border-base-content/10 bg-base-100/80">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5 pb-32 md:pb-12 min-h-0">
        <div className="flex flex-col gap-4 min-h-[50vh] items-stretch">
          {/* FOCUS: always visible at top — order-1 */}
          {doingStatus && (
            <div className="order-1 flex-1 min-w-0 flex flex-col gap-3 px-2 w-full rounded-xl border border-base-content/15 bg-base-100 py-3">
              <div className="flex items-center gap-3 px-3">
                <div className="w-1 h-8 rounded-full bg-base-content/40" />
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-base-content">Focus</h2>
                <span className="badge badge-neutral badge-sm font-semibold" title="One task at a time - swap or finish current to add another">1 slot</span>
                <span className="text-[11px] tracking-wide text-base-content/70 hidden sm:inline">Single-task mode</span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col max-h-[45vh] md:max-h-none">
                <DroppableColumn statusId={doingStatus.id} className="flex-1 min-h-0 overflow-hidden">
                  <div className="min-h-0 flex-1 rounded-xl border border-base-content/10 bg-base-100 p-4 flex flex-col overflow-y-auto">
                    {getCardsByStatus(doingStatus.id).map(card => (
                      <div key={card.id} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                        <DraggableCard card={card}>
                          <CardComponent
                            card={card}
                            statuses={statuses}
                            showActions={true}
                            constrainDescriptionOnMobile
                            onClick={() => !(showCreateModal || viewerCard || schedulingCard) && setViewerCardId(card.id)}
                            onStatusChange={(_, newStatusId) => handleStatusChange(card.id, newStatusId)}
                            onSchedule={handleSchedule}
                          />
                        </DraggableCard>
                      </div>
                    ))}
                    {getCardsByStatus(doingStatus.id).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center opacity-70 flex-1">
                        <p className="text-sm font-bold">No focus task yet</p>
                        <p className="text-xs mt-1">Move one from Backlog or start triage</p>
                        <button type="button" onClick={() => navigate(`/boards/${boardId}/prioritise`)} className="btn btn-primary btn-sm mt-4">Triage Backlog</button>
                      </div>
                    )}
                  </div>
                </DroppableColumn>
              </div>
            </div>
          )}

          {/* Scheduled: expandable calendar under focus */}
          <ScheduleTimeStrip
            className="order-2"
            cards={cards}
            scheduledStatusId={scheduledStatus?.id ?? null}
            filterText={filterText}
            onCardClick={(card) => !(showCreateModal || viewerCard || schedulingCard) && setViewerCardId(card.id)}
          />

          {/* Backlog: expandable — below scheduled */}
          <BacklogSection
            statuses={statuses}
            getCardsByStatus={getCardsByStatus}
            backlogCollapsed={backlogCollapsed}
            toggleSection={toggleSection}
            navigateToPrioritise={() => navigate(`/boards/${boardId}/prioritise`)}
            modalOpen={!!(showCreateModal || viewerCard || schedulingCard)}
            setSelectedStatusId={setSelectedStatusId}
            setShowCreateModal={setShowCreateModal}
            onCardClick={(card) => setViewerCardId(card.id)}
            onStatusChange={(cardId, newStatusId) => handleStatusChange(cardId, newStatusId)}
            onSchedule={handleSchedule}
          />

          {/* Archive: expandable — order-3, always stacked */}
          <ArchiveSection
            statuses={statuses}
            getCardsByStatus={getCardsByStatus}
            collapsedCategories={collapsedCategories}
            archiveCollapsed={archiveCollapsed}
            toggleSection={toggleSection}
            toggleColumn={toggleColumn}
            modalOpen={!!(showCreateModal || viewerCard || schedulingCard)}
            onCardClick={(card) => setViewerCardId(card.id)}
            onStatusChange={(cardId, newStatusId) => handleStatusChange(cardId, newStatusId)}
            onSchedule={handleSchedule}
          />
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
          onClose={() => setViewerCardId(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
          }}
          onDeleted={() => {
            setViewerCardId(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
          }}
          variant="modal"
        />
      )}
      {board && statuses.length > 0 && statuses.some(s => s.category === 'maybe') && (
        <>
          {/* + button: always visible when quick-add bar is closed (mobile + desktop) */}
          {!showQuickAddBar && (
            <div className="fixed right-4 z-[60] bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] md:bottom-6 md:right-6">
              <button
                type="button"
                onClick={openQuickAdd}
                className="btn btn-primary h-12 min-h-12 w-12 md:h-14 md:min-h-14 md:w-14 rounded-lg text-2xl border border-base-100/80 shadow-sm"
                title={`New card (${shortcuts.new_card?.key ? shortcuts.new_card.key.toUpperCase() : 'N'})`}
              >
                +
              </button>
            </div>
          )}
          {showQuickAddBar && (
            <button
              type="button"
              className="fixed inset-0 z-[59] bg-base-content/20"
              aria-label="Close quick add"
              onClick={closeQuickAdd}
            />
          )}
          {/* Slide-up "What needs doing" panel — visible when + clicked or new_card shortcut */}
          <div
            className={`fixed left-0 right-0 bottom-0 z-[60] bg-base-100/95 backdrop-blur-md border-t border-base-content/10 transition-transform duration-300 ease-out ${
              showQuickAddBar ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div
              className={`mx-auto w-full px-4 py-4 transition-[height,max-height,padding,width] duration-300 ease-out ${
                quickAddExpanded
                  ? 'h-[100dvh] max-h-[100dvh] max-w-none pb-[calc(env(safe-area-inset-bottom)+1rem)] flex flex-col'
                  : 'max-w-2xl max-h-[16rem] sm:max-h-[15rem]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">What needs doing?</span>
                <button
                  type="button"
                  onClick={closeQuickAdd}
                  className="btn btn-ghost btn-circle btn-sm"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div id="quick-add-panel-body" className={`min-h-0 ${quickAddExpanded ? 'flex-1 overflow-y-auto pr-1' : 'overflow-visible'}`}>
                <QuickCaptureBar
                  key={quickAddSession}
                  placeholder="What needs doing?"
                  backlogCount={cards.filter(c => statuses.find(s => s.id === c.statusId)?.category === 'maybe').length}
                  disabled={!!(viewerCard || schedulingCard)}
                  focusOnOpen={showQuickAddBar}
                  focusRequestId={quickAddSession}
                  collapseDetailsSignal={quickAddCollapseSignal}
                  onDetailsVisibilityChange={(isVisible) => setQuickAddExpanded(isVisible)}
                  onSubmit={async ({ title, description, images, priority, difficulty }) => {
                    const maybeStatus = statuses.find(s => s.category === 'maybe');
                    if (!boardId || !maybeStatus) return;
                    try {
                      const newCard = await apiClient.createCard(boardId, {
                        title,
                        description: description?.trim() ? description : undefined,
                        statusId: maybeStatus.id,
                        difficulty: difficulty ?? 3,
                        priority: priority ?? 3,
                      });

                      if (images && images.length > 0) {
                        const uploaded = await Promise.all(
                          images.map((file) => apiClient.uploadAttachment(newCard.id, file))
                        );
                        const imageHtml = uploaded
                          .filter((attachment) => attachment.mimeType.startsWith('image/'))
                          .map((attachment) => `<p><img src="${attachment.url}" alt="${attachment.filename}" /></p>`)
                          .join('');

                        if (imageHtml) {
                          const baseDescription = description?.trim() ? description : '<p></p>';
                          await apiClient.updateCard(newCard.id, { description: `${baseDescription}${imageHtml}` });
                        }
                      }

                      queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId) });
                      closeQuickAdd();
                    } catch (err: unknown) {
                      setErrorMessage(err instanceof Error ? err.message : 'Failed to create task');
                      throw err;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
