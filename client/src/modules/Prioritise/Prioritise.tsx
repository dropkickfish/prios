import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { CardType, StatusType } from '../../types';
import { apiClient } from '../../api/client';
import { CardDetailModal } from '../Dashboard/CardDetailModal';
import { useShortcut } from '../../context/KeyboardContext';

interface PrioritiseProps {
  boardId: string;
  onBack: () => void;
  onViewExecute: () => void;
}

export const Prioritise = ({ boardId, onBack, onViewExecute }: PrioritiseProps) => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const crossOpacity = useTransform(x, [-150, -50], [1, 0]);
  const checkOpacity = useTransform(x, [50, 150], [0, 1]);

  useEffect(() => {
    const fetchData = async () => {
      const [boardStatuses, boardCards] = await Promise.all([
        apiClient.getStatuses(boardId),
        apiClient.getCards(boardId),
      ]);

      setStatuses(boardStatuses);
      
      // Filter for cards in 'maybe' category
      const joinedCards = boardCards.map((c: any) => ({
        ...c,
        statusCategory: boardStatuses.find((s: StatusType) => s.id === c.statusId)?.category
      }));
      
      const maybeCards = joinedCards.filter((c: any) => c.statusCategory === 'maybe');
      setCards(maybeCards);
      setLoading(false);
    };

    fetchData();
  }, [boardId]);

  const handleDecision = async (decision: 'yes' | 'no') => {
    const activeCard = cards[currentIndex];
    if (!activeCard) return;

    setExitDirection(decision === 'yes' ? 'right' : 'left');

    // Wait for animation to complete
    setTimeout(async () => {
      if (decision === 'yes') {
        const doingStatus = statuses.find(s => s.category === 'doing');
        if (doingStatus) {
          try {
            await apiClient.updateCard(activeCard.id, { statusId: doingStatus.id });
            onViewExecute();
            return;
          } catch (err: any) {
            setError(err.message || 'Failed to move to Doing. Is another task already in progress?');
            setExitDirection(null);
            return;
          }
        }
      } else {
        // Move to next card in the maybe pile
        await apiClient.recordAbandon();
      }
      
      setCurrentIndex(prev => prev + 1);
      setExitDirection(null);
      x.set(0);
    }, 300);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 150;
    if (Math.abs(info.offset.x) > threshold) {
      handleDecision(info.offset.x > 0 ? 'yes' : 'no');
    } else {
      x.set(0);
    }
  };

  const refreshCards = async () => {
    const boardCards = await apiClient.getCards(boardId);
    const joinedCards = boardCards.map((c: any) => ({
      ...c,
      statusCategory: statuses.find((s: StatusType) => s.id === c.statusId)?.category
    }));
    const maybeCards = joinedCards.filter((c: any) => c.statusCategory === 'maybe');
    setCards(maybeCards);
  };

  // Keyboard shortcuts
  useShortcut('arrow_left', () => handleDecision('no'), currentIndex < cards.length);
  useShortcut('arrow_right', () => handleDecision('yes'), currentIndex < cards.length);
  useShortcut('arrow_up', () => {
    if (currentIndex < cards.length) {
      setSelectedCard(cards[currentIndex]);
    }
  }, currentIndex < cards.length);

  // Render HTML description
  const renderDescription = (description: string | null) => {
    if (!description) return null;
    
    // If it's HTML from TipTap
    if (description.includes('<p>') || description.includes('<')) {
      return (
        <div 
          className="text-sm opacity-70 line-clamp-4 leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: description }}
        />
      );
    }
    
    // Plain text
    return (
      <p className="text-sm opacity-70 line-clamp-4 leading-relaxed">
        {description}
      </p>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <span className="loading loading-ring loading-lg text-secondary"></span>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-6">
        <div className="p-10 bg-base-100 rounded-full shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-success opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold opacity-40 uppercase tracking-widest text-base-content">Backlog Triaged</h2>
          <p className="opacity-60 text-base-content/70">No more "Maybe" tasks for now. Great work!</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost">Back to Dashboard</button>
      </div>
    );
  }

  const activeCard = cards[currentIndex];
  const nextCards = cards.slice(currentIndex + 1, currentIndex + 3);

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center p-4">
      <header className="mb-12 flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-secondary font-black bg-secondary/10 px-4 py-1 rounded-full w-fit mx-auto">
          Triage Mode
        </span>
        <p className="text-[10px] opacity-40 uppercase font-bold">
          Card {currentIndex + 1} of {cards.length}
        </p>
      </header>

      {error && (
        <div className="alert alert-error mb-8 shadow-lg text-xs font-bold uppercase tracking-tight">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-xs">OK</button>
        </div>
      )}

      {/* Card Stack */}
      <div className="relative w-full h-[450px] mb-12">
        {/* Background cards (stack preview) */}
        {nextCards.map((card, index) => (
          <div
            key={card.id}
            className="absolute inset-0 card bg-base-100 shadow-xl border-b-4 border-base-300"
            style={{
              transform: `scale(${1 - (index + 1) * 0.05}) translateY(${(index + 1) * -10}px)`,
              opacity: 0.5 - index * 0.2,
              zIndex: -index - 1,
            }}
          />
        ))}

        {/* Active card */}
        <motion.div
          className="absolute inset-0 card bg-base-100 shadow-2xl border-b-8 border-secondary cursor-grab active:cursor-grabbing"
          style={{
            x,
            rotate,
            opacity,
            zIndex: 10,
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          animate={exitDirection ? {
            x: exitDirection === 'right' ? 500 : -500,
            opacity: 0,
            transition: { duration: 0.3 }
          } : {}}
        >
          <div className="card-body flex flex-col justify-center items-center p-8 h-full">
            <h1 className="text-4xl font-black leading-tight text-base-content mb-6">
              {activeCard.title}
            </h1>
            
            <div className="flex justify-center gap-3 mb-6">
              <span className="badge badge-outline badge-lg font-black tracking-tight">
                DIFF: {activeCard.difficulty}
              </span>
              <span className="badge badge-outline badge-lg font-black tracking-tight">
                PRIO: {activeCard.priority}
              </span>
            </div>
            
            {activeCard.description && (
              <div className="max-w-sm">
                {renderDescription(activeCard.description)}
              </div>
            )}

            {/* Tap to view details hint */}
            <button
              onClick={() => setSelectedCard(activeCard)}
              className="mt-auto text-xs opacity-30 hover:opacity-60 transition-opacity uppercase tracking-widest font-bold"
            >
              ↑ View Details
            </button>
          </div>

          {/* Swipe indicators */}
          <motion.div
            className="absolute top-8 left-8 text-6xl font-black text-error rotate-[-20deg]"
            style={{ opacity: crossOpacity }}
          >
            ✗
          </motion.div>
          <motion.div
            className="absolute top-8 right-8 text-6xl font-black text-success rotate-[20deg]"
            style={{ opacity: checkOpacity }}
          >
            ✓
          </motion.div>
        </motion.div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-6 w-full px-4">
        <button 
          onClick={() => handleDecision('no')}
          className="btn btn-outline btn-lg h-20 text-xl gap-2 border-2 hover:bg-base-200 hover:text-base-content"
          disabled={exitDirection !== null}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          Not Today
        </button>
        <button 
          onClick={() => handleDecision('yes')}
          className="btn btn-secondary btn-lg h-20 text-xl shadow-xl shadow-secondary/30 gap-2 border-none"
          disabled={exitDirection !== null}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          Focus Now
        </button>
      </div>

      <button onClick={onBack} className="mt-10 btn btn-ghost btn-sm opacity-40 hover:opacity-100 transition-opacity">
        Wait, take me back
      </button>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          statuses={statuses}
          allCards={cards}
          onClose={() => setSelectedCard(null)}
          onUpdated={() => {
            refreshCards();
            setSelectedCard(null);
          }}
          onDeleted={() => {
            refreshCards();
            setSelectedCard(null);
          }}
        />
      )}
    </div>
  );
};
