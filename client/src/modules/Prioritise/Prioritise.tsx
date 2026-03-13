import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import type { CardType, StatusType, TagType } from '../../types';
import { CardComponent } from '../../components/CardComponent';
import { CardDetailModal } from '../Dashboard/CardDetailModal';
import { useShortcut } from '../../context/KeyboardContext';
import { getTriageAutoFocusEnabled, getTriageAutoFocusMinutes } from '../../settings/triageSettings';

// --- Per-card drag component: each instance owns its own motion values ---

interface DragCardProps {
  card: CardType;
  statuses: StatusType[];
  swipeOut: 'left' | 'right' | null;
  onDecide: (direction: 'left' | 'right') => void;
  onTap: () => void;
}

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 400;

const DragCard = ({ card, statuses, swipeOut, onDecide, onTap }: DragCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 0, 150], [-18, 0, 18]);
  const skipOpacity = useTransform(x, [-20, -80], [0, 1]);
  const focusOpacity = useTransform(x, [20, 80], [0, 1]);

  // Programmatic swipe (from buttons / keyboard)
  useEffect(() => {
    if (!swipeOut) return;
    animate(x, swipeOut === 'right' ? 500 : -500, { type: 'spring', stiffness: 400, damping: 30 });
  }, [swipeOut]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      drag="x"
      style={{ x, rotate }}
      dragConstraints={false}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        const isTap = Math.abs(info.offset.x) < 8 && Math.abs(info.offset.y) < 8;
        if (isTap) { onTap(); return; }
        const isRight = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY;
        const isLeft = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY;
        if (isRight) {
          animate(x, 500, { type: 'spring', stiffness: 400, damping: 30 });
          onDecide('right');
        } else if (isLeft) {
          animate(x, -500, { type: 'spring', stiffness: 400, damping: 30 });
          onDecide('left');
        } else {
          animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
        }
      }}
      className="w-full cursor-grab active:cursor-grabbing"
    >
      <div className="h-56 sm:h-64 flex flex-col shadow-2xl overflow-hidden border-2 border-primary/10 rounded-[2.5rem] relative bg-base-100 [&_*]:touch-none">
        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute inset-0 z-10 rounded-[2.5rem] bg-error/10 flex items-center justify-start pl-8 pointer-events-none"
        >
          <span className="text-3xl font-black text-error border-4 border-error rounded-xl px-4 py-2 rotate-[15deg]">SKIP</span>
        </motion.div>
        <motion.div
          style={{ opacity: focusOpacity }}
          className="absolute inset-0 z-10 rounded-[2.5rem] bg-success/10 flex items-center justify-end pr-8 pointer-events-none"
        >
          <span className="text-3xl font-black text-success border-4 border-success rounded-xl px-4 py-2 rotate-[-15deg]">FOCUS</span>
        </motion.div>
        {card.deferredCount > 3 && (
          <div className="absolute top-4 right-4 z-10">
            <span className="badge badge-warning badge-sm font-black py-3 px-4 shadow-lg border-none animate-bounce">NEGLECTED</span>
          </div>
        )}
        <CardComponent
          card={card}
          statuses={statuses}
          variant="triage"
          showActions={false}
        />
      </div>
    </motion.div>
  );
};

// --- Main Prioritise view ---

export const Prioritise = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'priority' | 'difficulty'>('value');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [sessionLimit] = useState(10);
  const [swapPrompt, setSwapPrompt] = useState<{ currentDoing: CardType; cardToFocus: CardType } | null>(null);
  const [showSwitching, setShowSwitching] = useState(false);
  const [swipeOut, setSwipeOut] = useState<'left' | 'right' | null>(null);
  const autoFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allCards = [], isLoading: cardsLoading } = useQuery<CardType[]>({
    queryKey: queryKeys.cards(boardId!),
    queryFn: () => apiClient.getCards(boardId!),
    enabled: !!boardId,
  });

  const { data: statuses = [], isLoading: statusesLoading } = useQuery<StatusType[]>({
    queryKey: queryKeys.statuses(boardId!),
    queryFn: () => apiClient.getStatuses(boardId!),
    enabled: !!boardId,
  });

  const loading = cardsLoading || statusesLoading;

  const maybeStatusIds = statuses.filter(s => s.category === 'maybe').map(s => s.id);
  let maybeCards = allCards.filter(c => maybeStatusIds.includes(c.statusId));

  const tagsMap = new Map<string, TagType>();
  maybeCards.forEach(card => {
    card.tags?.forEach(tag => {
      if (!tagsMap.has(tag.id)) tagsMap.set(tag.id, tag);
    });
  });
  const availableTags = Array.from(tagsMap.values());

  maybeCards = [...maybeCards].sort((a, b) => {
    let valA = 0, valB = 0;
    switch (sortBy) {
      case 'value':   valA = a.smartScore || 0; valB = b.smartScore || 0; break;
      case 'priority': valA = a.priority; valB = b.priority; break;
      case 'difficulty': valA = a.difficulty; valB = b.difficulty; break;
    }
    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });

  const filteredCards = maybeCards
    .filter(c => selectedTagIds.length === 0 || (c.tags && c.tags.some(t => selectedTagIds.includes(t.id))))
    .slice(0, sessionLimit);

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

  useShortcut('arrow_left', () => handleDecision('skip'));
  useShortcut('arrow_right', () => handleDecision('focus'));
  useShortcut('arrow_up', () => currentCard && setEditingCard(currentCard));

  useEffect(() => {
    const hasCard = filteredCards[currentIndex];
    if (!boardId || !hasCard) return;
    startAutoFocusTimer();
    return clearAutoFocusTimer;
  }, [boardId, currentIndex, filteredCards.length]);

  const handleDecision = async (decision: 'skip' | 'focus') => {
    if (!boardId || currentIndex >= filteredCards.length) return;
    const card = filteredCards[currentIndex];

    setSwipeOut(decision === 'focus' ? 'right' : 'left');

    if (decision === 'focus') {
      const doingStatus = statuses.find(s => s.category === 'doing');
      if (!doingStatus) { setSwipeOut(null); return; }
      try {
        await apiClient.updateCard(card.id, { statusId: doingStatus.id });
        queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId) });
        setTimeout(() => {
          setSwipeOut(null);
          navigate(`/boards/${boardId}/execute`);
        }, 300);
      } catch (err: any) {
        setSwipeOut(null);
        if (err?.message?.includes('Only one card') || err?.message?.includes('already in progress')) {
          const allBoardCards = await apiClient.getCards(boardId!);
          const doingCard = allBoardCards.find((c: CardType) => c.statusCategory === 'doing' || c.statusId === doingStatus.id);
          if (doingCard) setSwapPrompt({ currentDoing: doingCard, cardToFocus: card });
          else alert(err.message || 'Another task is in Focus. Finish it first.');
        } else {
          alert(err.message || 'Failed to move to Focus.');
        }
      }
    } else {
      try {
        const newCount = (card.deferredCount || 0) + 1;
        if (newCount >= 10) {
          if (window.confirm(`You've skipped "${card.title}" ${newCount} times. Should we just delete it?`)) {
            await apiClient.deleteCard(card.id);
          } else {
            await apiClient.updateCard(card.id, { deferredCount: newCount });
          }
        } else {
          await apiClient.updateCard(card.id, { deferredCount: newCount });
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId) });
      } catch (err) {
        console.error('Failed to update deferred count', err);
      }
      setTimeout(() => {
        setSwipeOut(null);
        setCurrentIndex(prev => prev + 1);
      }, 300);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
    setCurrentIndex(0);
  };

  const swapPromptDesc = (card: CardType) => {
    if (!card.description) return '';
    const raw = typeof card.description === 'string'
      ? card.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : (card.description as { content?: Array<{ content?: Array<{ text?: string }> }> })?.content?.flatMap(n => (n.content ?? []).map(c => c.text ?? '')).join(' ') ?? '';
    return raw.slice(0, 140) + (raw.length > 140 ? '…' : '');
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
          {maybeCards.length > 0 ? "You've finished this triage session." : "Your backlog is clear!"}
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
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-primary' : i < currentIndex ? 'w-4 bg-primary/20' : 'w-4 bg-base-300'}`} />
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-center pb-2">
          <select
            className="select select-xs select-bordered rounded-full bg-base-200 font-bold uppercase text-[10px] tracking-widest"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as any); setCurrentIndex(0); }}
          >
            <option value="value">Impact (P/D)</option>
            <option value="priority">Priority</option>
            <option value="difficulty">Difficulty</option>
          </select>
          <button
            className="btn btn-xs btn-circle btn-ghost bg-base-200"
            onClick={() => { setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); setCurrentIndex(0); }}
          >
            {sortOrder === 'desc' ? '⬇' : '⬆'}
          </button>
        </div>

        {availableTags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 overflow-x-auto py-2 scrollbar-hide max-w-full">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`btn btn-xs rounded-full border-none px-3 font-bold transition-all ${
                  selectedTagIds.includes(tag.id) ? 'bg-primary text-white scale-110' : 'bg-base-200 opacity-60 hover:opacity-100'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full mx-auto">
        <AnimatePresence>
          <DragCard
            key={currentCard.id}
            card={currentCard}
            statuses={statuses}
            swipeOut={swipeOut}
            onDecide={(dir) => handleDecision(dir === 'right' ? 'focus' : 'skip')}
            onTap={() => setEditingCard(currentCard)}
          />
        </AnimatePresence>
      </div>

      <div className="flex gap-8 items-center pt-4">
        <button
          onClick={() => handleDecision('skip')}
          className="btn btn-circle btn-lg h-20 w-20 bg-base-100 border-none shadow-xl hover:bg-error hover:text-white transition-all scale-90 hover:scale-100"
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
          allCards={allCards}
          statuses={statuses}
          onClose={() => setEditingCard(null)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) })}
          onDeleted={() => {
            setEditingCard(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
          }}
        />
      )}

      <AnimatePresence>
        {showSwitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-base-100/80 backdrop-blur-sm"
          >
            <p className="text-2xl font-black text-primary">Switching focus...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {swapPrompt && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-base-content/30 backdrop-blur-sm" onClick={() => setSwapPrompt(null)} role="dialog" aria-modal="true">
          <div className="bg-base-100 border border-base-content/10 shadow-2xl rounded-2xl p-5 w-full max-w-md max-h-[calc(100dvh-4rem)] flex flex-col min-h-0" onClick={e => e.stopPropagation()}>
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
                    queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
                    setShowSwitching(true);
                    setTimeout(() => { setShowSwitching(false); navigate(`/boards/${boardId}/execute`); }, 600);
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
                    queryClient.invalidateQueries({ queryKey: queryKeys.cards(boardId!) });
                    setShowSwitching(true);
                    setTimeout(() => { setShowSwitching(false); navigate(`/boards/${boardId}/execute`); }, 600);
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
        </div>,
        document.body
      )}
    </div>
  );
};
