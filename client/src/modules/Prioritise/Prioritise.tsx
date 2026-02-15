import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import type { CardType, StatusType, TagType } from '../../types';
import { CardComponent } from '../../components/CardComponent';
import { CardDetailModal } from '../Dashboard/CardDetailModal';
import { useShortcut } from '../../context/KeyboardContext';
import { getTriageAutoFocusEnabled, getTriageAutoFocusMinutes } from '../../settings/triageSettings';

export const Prioritise = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardType[]>([]);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'priority' | 'difficulty'>('value');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [sessionLimit] = useState(10);
  const [swapPrompt, setSwapPrompt] = useState<{ currentDoing: CardType; cardToFocus: CardType } | null>(null);
  const autoFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartRef = useRef<{ x: number } | null>(null);
  const hasDraggedRef = useRef(false);

  const clearAutoFocusTimer = () => {
    if (autoFocusTimerRef.current) {
      clearTimeout(autoFocusTimerRef.current);
      autoFocusTimerRef.current = null;
    }
  };

  const startAutoFocusTimer = () => {
    clearAutoFocusTimer();
    if (!boardId || !getTriageAutoFocusEnabled()) return;
    const minutes = getTriageAutoFocusMinutes();
    autoFocusTimerRef.current = setTimeout(() => {
      autoFocusTimerRef.current = null;
      navigate(`/boards/${boardId}/execute`);
    }, minutes * 60 * 1000);
  };

  // Keyboard Shortcuts for Triage
  useShortcut('arrow_left', () => handleDecision('skip'));
  useShortcut('arrow_right', () => handleDecision('focus'));
  useShortcut('arrow_up', () => currentCard && setEditingCard(currentCard));

  useEffect(() => {
    if (boardId) {
      fetchData();
    }
  }, [boardId, sortBy, sortOrder]);

  const fetchData = async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [allCards, boardStatuses] = await Promise.all([
        apiClient.getCards(boardId),
        apiClient.getStatuses(boardId)
      ]);
      
      setStatuses(boardStatuses);
      
      const maybeStatuses = boardStatuses.filter((s: StatusType) => s.category === 'maybe').map((s: StatusType) => s.id);
      let maybeCards = allCards.filter((c: CardType) => maybeStatuses.includes(c.statusId));
      
      // Extract tags from maybeCards
      const tagsMap = new Map<string, TagType>();
      maybeCards.forEach((card: CardType) => {
        card.tags?.forEach((tag: TagType) => {
          if (!tagsMap.has(tag.id)) {
            tagsMap.set(tag.id, tag);
          }
        });
      });
      setAvailableTags(Array.from(tagsMap.values()));

      // Sort cards
      maybeCards.sort((a: CardType, b: CardType) => {
        let valA = 0;
        let valB = 0;

        switch (sortBy) {
          case 'value':
             valA = a.smartScore || 0;
             valB = b.smartScore || 0;
             break;
          case 'priority':
             valA = a.priority;
             valB = b.priority;
             break;
          case 'difficulty':
             valA = a.difficulty;
             valB = b.difficulty;
             break;
        }

        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
      
      setCards(maybeCards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards
    .filter(c => selectedTagIds.length === 0 || (c.tags && c.tags.some(t => selectedTagIds.includes(t.id))))
    .slice(0, sessionLimit);

  // Start or reset "blend into focus" timer when in triage with a card (must be after filteredCards)
  useEffect(() => {
    const hasCard = filteredCards[currentIndex];
    if (!boardId || !hasCard) return;
    startAutoFocusTimer();
    return clearAutoFocusTimer;
  }, [boardId, currentIndex, filteredCards.length]);

  const handleDecision = async (decision: 'skip' | 'focus') => {
    if (!boardId || currentIndex >= filteredCards.length) return;

    const card = filteredCards[currentIndex];
    setDirection(decision === 'focus' ? 1 : -1);

    if (decision === 'focus') {
      const doingStatus = statuses.find(s => s.category === 'doing');
      if (!doingStatus) {
        setDirection(0);
        return;
      }
      try {
        await apiClient.updateCard(card.id, { statusId: doingStatus.id });
        setTimeout(() => {
          setDirection(0);
          navigate(`/boards/${boardId}/execute`);
        }, 300);
      } catch (err: any) {
        setDirection(0);
        if (err?.message?.includes('Only one card') || err?.message?.includes('already in progress')) {
          const allCards = await apiClient.getCards(boardId!);
          const doingCard = allCards.find((c: CardType) => c.statusCategory === 'doing' || c.statusId === doingStatus.id);
          if (doingCard) setSwapPrompt({ currentDoing: doingCard, cardToFocus: card });
          else alert(err.message || 'Another task is in Focus. Finish it first.');
        } else {
          alert(err.message || 'Failed to move to Focus.');
        }
      }
    } else {
      // Skip logic: increment deferredCount
      try {
        const newCount = (card.deferredCount || 0) + 1;
        
        if (newCount >= 10) {
          if (window.confirm(`You've skipped "${card.title}" ${newCount} times. Should we just delete it?`)) {
            await apiClient.deleteCard(card.id);
            // Refresh cards or just move to next
          } else {
            await apiClient.updateCard(card.id, { deferredCount: newCount });
          }
        } else {
          await apiClient.updateCard(card.id, { deferredCount: newCount });
        }
      } catch (err) {
        console.error("Failed to update deferred count", err);
      }

      setTimeout(() => {
        setDirection(0);
        setCurrentIndex(prev => prev + 1);
      }, 300);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
    setCurrentIndex(0); // Reset session
  };

  const swapPromptDesc = (card: CardType) => {
    if (!card.description) return '';
    const raw = typeof card.description === 'string'
      ? card.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : (card.description as { content?: Array<{ content?: Array<{ text?: string }> }> })?.content?.flatMap(n => (n.content ?? []).map(c => c.text ?? '')).join(' ') ?? '';
    return raw.slice(0, 140) + (raw.length > 140 ? '…' : '');
  };

  const SWIPE_THRESHOLD = 80;
  const DRAG_CAP = 120;

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX };
    setDragOffset(0);
    hasDraggedRef.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartRef.current == null) return;
    const delta = e.clientX - dragStartRef.current.x;
    if (Math.abs(delta) > 10) hasDraggedRef.current = true;
    setDragOffset(Math.max(-DRAG_CAP, Math.min(DRAG_CAP, delta)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (dragStartRef.current == null) return;
    const delta = dragOffset;
    dragStartRef.current = null;
    setDragOffset(0);
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      handleDecision(delta > 0 ? 'focus' : 'skip');
    }
    if (hasDraggedRef.current) {
      setTimeout(() => { hasDraggedRef.current = false; }, 100);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragStartRef.current = null;
    setDragOffset(0);
  };

  const handleCardClick = (_id?: string) => {
    if (hasDraggedRef.current) return;
    setEditingCard(currentCard!);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const currentCard = filteredCards[currentIndex];

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-6">
        <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-success">
             <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <h2 className="text-3xl font-black text-base-content">Session Complete!</h2>
        <p className="opacity-60 text-center max-w-xs text-base-content">
          {cards.length > 0 ? "You've finished this triage session." : "Your backlog is clear!"}
        </p>
        <div className="flex gap-4">
          <button onClick={() => navigate('/')} className="btn btn-ghost">Dashboard</button>
          <button onClick={() => navigate(`/boards/${boardId}/execute`)} className="btn btn-primary text-white">Go to Execute</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md lg:max-w-xl xl:max-w-2xl mx-auto flex-1 flex flex-col min-h-0 items-center justify-start space-y-6 py-4">
      <div className="text-center w-full space-y-4">
         <div>
           <h1 className="text-sm font-black uppercase tracking-[0.3em] opacity-30 mb-2 text-base-content">Triage Mode</h1>
           <div className="flex justify-center gap-1">
              {filteredCards.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-primary' : i < currentIndex ? 'w-4 bg-primary/20' : 'w-4 bg-base-300'}`}></div>
              ))}
           </div>
         </div>

         {/* Sorting Controls */}
         <div className="flex gap-2 justify-center pb-2">
            <select 
              className="select select-xs select-bordered rounded-full bg-base-200 font-bold uppercase text-[10px] tracking-widest"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentIndex(0);
              }}
            >
              <option value="value">Impact (P/D)</option>
              <option value="priority">Priority</option>
              <option value="difficulty">Difficulty</option>
            </select>
            <button 
              className="btn btn-xs btn-circle btn-ghost bg-base-200"
              onClick={() => {
                setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                setCurrentIndex(0);
              }}
            >
              {sortOrder === 'desc' ? '⬇' : '⬆'}
            </button>
         </div>

         {/* Tag Filter */}
         {availableTags.length > 0 && (
           <div className="flex flex-wrap justify-center gap-2 overflow-x-auto py-2 scrollbar-hide max-w-full">
              {availableTags.map(tag => (
                <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`btn btn-xs rounded-full border-none px-3 font-bold transition-all ${
                  selectedTagIds.includes(tag.id) 
                    ? 'bg-primary text-white scale-110' 
                    : 'bg-base-200 opacity-60 hover:opacity-100'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
         )}
      </div>

      <div className="relative w-full flex-1 min-h-0 flex flex-col mx-auto">
        <div className="flex-1 min-h-0 flex flex-col perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                x: direction * 400 + dragOffset,
                rotate: direction * 20 + (dragOffset !== 0 ? dragOffset * 0.03 : 0)
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="w-full h-full min-h-0 flex flex-col cursor-grab active:cursor-grabbing touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <div className="h-full min-h-0 flex flex-col shadow-2xl overflow-hidden border-2 border-primary/10 rounded-[2.5rem] relative bg-base-100 pointer-events-auto">
                {currentCard.deferredCount > 3 && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="badge badge-warning badge-sm font-black py-3 px-4 shadow-lg border-none animate-bounce">NEGLECTED</span>
                  </div>
                )}
                <CardComponent
                  card={currentCard}
                  statuses={statuses}
                  variant="triage"
                  fillHeight
                  showActions={false}
                  onClick={handleCardClick}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex gap-8 items-center pt-4">
        <button 
          onClick={() => handleDecision('skip')}
          className="btn btn-circle btn-lg h-20 w-20 bg-base-100 border-none shadow-xl hover:bg-error hover:text-white transition-all group scale-90 hover:scale-100"
          title="Skip for now (Left Arrow)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <button 
          onClick={() => handleDecision('focus')}
          className="btn btn-circle btn-lg h-20 w-20 bg-primary border-none shadow-xl shadow-primary/30 hover:bg-primary-focus text-white transition-all hover:scale-110"
          title="Focus Now (Right Arrow)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </button>
      </div>

      <div className="flex gap-4">
        <button onClick={() => navigate('/')} className="btn btn-ghost btn-xs opacity-30">Exit Session</button>
      </div>

      {editingCard && (
        <CardDetailModal 
          card={editingCard}
          allCards={cards}
          statuses={statuses}
          onClose={() => setEditingCard(null)}
          onUpdated={fetchData}
          onDeleted={fetchData}
        />
      )}

      {swapPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-base-content/30 backdrop-blur-sm" onClick={() => setSwapPrompt(null)} role="dialog" aria-modal="true">
          <div className="bg-base-100 border border-base-content/10 shadow-2xl rounded-2xl p-4 sm:p-5 max-w-md w-full max-h-[90vh] flex flex-col min-h-0" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-base sm:text-lg shrink-0">Focus slot is in use</h3>
            <p className="text-xs sm:text-sm opacity-80 shrink-0 mt-1">
              Mark the current task done or move to Backlog so this task can take its place.
            </p>
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-y-auto py-2">
              <div className="rounded-xl bg-base-200/60 p-3 border border-base-content/10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Currently in focus</p>
                <p className="font-bold text-sm mt-0.5 line-clamp-1">{swapPrompt.currentDoing.title}</p>
                {swapPromptDesc(swapPrompt.currentDoing) && (
                  <p className="text-xs opacity-70 mt-1 line-clamp-2">{swapPromptDesc(swapPrompt.currentDoing)}</p>
                )}
              </div>
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Task to focus</p>
                <p className="font-bold text-sm mt-0.5 line-clamp-1">{swapPrompt.cardToFocus.title}</p>
                {swapPromptDesc(swapPrompt.cardToFocus) && (
                  <p className="text-xs opacity-70 mt-1 line-clamp-2">{swapPromptDesc(swapPrompt.cardToFocus)}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 pt-2">
              <button
                type="button"
                className="btn btn-primary w-full btn-sm sm:btn-md"
                onClick={async () => {
                  const doneStatus = statuses.find(s => s.category === 'done');
                  const doingStatus = statuses.find(s => s.category === 'doing');
                  if (!doneStatus || !doingStatus) return;
                  try {
                    await apiClient.updateCard(swapPrompt.currentDoing.id, { statusId: doneStatus.id });
                    await apiClient.updateCard(swapPrompt.cardToFocus.id, { statusId: doingStatus.id });
                    setSwapPrompt(null);
                    await fetchData();
                    navigate(`/boards/${boardId}/execute`);
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : 'Failed to update');
                  }
                }}
              >
                Mark done, then focus this
              </button>
              <button
                type="button"
                className="btn btn-ghost border border-base-content/20 w-full btn-sm sm:btn-md"
                onClick={async () => {
                  const maybeStatus = statuses.find(s => s.category === 'maybe');
                  const doingStatus = statuses.find(s => s.category === 'doing');
                  if (!maybeStatus || !doingStatus) return;
                  try {
                    await apiClient.updateCard(swapPrompt.currentDoing.id, { statusId: maybeStatus.id });
                    await apiClient.updateCard(swapPrompt.cardToFocus.id, { statusId: doingStatus.id });
                    setSwapPrompt(null);
                    await fetchData();
                    navigate(`/boards/${boardId}/execute`);
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : 'Failed to update');
                  }
                }}
              >
                Move to Backlog, then focus this
              </button>
              <button type="button" className="btn btn-ghost btn-sm w-full opacity-60" onClick={() => setSwapPrompt(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
