import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import type { CardType, StatusType, TagType } from '../../types';
import { CardComponent } from '../../components/CardComponent';
import { CardDetailModal } from '../Dashboard/CardDetailModal';
import { useShortcut } from '../../context/KeyboardContext';

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
  const [sessionLimit] = useState(10); // Default session limit

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

  const handleDecision = async (decision: 'skip' | 'focus') => {
    if (!boardId || currentIndex >= filteredCards.length) return;

    const card = filteredCards[currentIndex];
    setDirection(decision === 'focus' ? 1 : -1);

    if (decision === 'focus') {
      try {
        const doingStatus = statuses.find(s => s.category === 'doing');
        if (!doingStatus) throw new Error('No "Doing" status found for this board');

        await apiClient.updateCard(card.id, { statusId: doingStatus.id });
        
        setTimeout(() => {
          setDirection(0);
          navigate(`/boards/${boardId}/execute`);
        }, 300);
      } catch (err: any) {
        alert(err.message || 'Another task is already in progress. Finish it first!');
        setDirection(0);
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
    <div className="max-w-md mx-auto h-[85vh] flex flex-col items-center justify-center space-y-6">
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
              <option value="value">Value (P/D)</option>
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

      <div className="relative w-full aspect-[3/4] perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              x: direction * 400,
              rotate: direction * 20
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          >
            <div className="h-full shadow-2xl overflow-hidden border-2 border-primary/10 rounded-[2.5rem] relative">
              {currentCard.deferredCount > 3 && (
                <div className="absolute top-4 right-4 z-10">
                   <span className="badge badge-warning badge-sm font-black py-3 px-4 shadow-lg border-none animate-bounce">NEGLECTED</span>
                </div>
              )}
              <CardComponent 
                card={currentCard} 
                showActions={false} 
                onClick={() => setEditingCard(currentCard)}
              />
            </div>
          </motion.div>
        </AnimatePresence>
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
    </div>
  );
};
