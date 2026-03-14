import { useState } from 'react';
import type { CardType } from '../../types';

type TimeBucket = 'today' | 'tomorrow' | 'week';

function getCardBucket(card: CardType): TimeBucket | null {
  const at = card.scheduledAt ? new Date(card.scheduledAt) : null;
  if (!at) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const atDay = new Date(at);
  atDay.setHours(0, 0, 0, 0);
  if (atDay.getTime() === today.getTime()) return 'today';
  if (atDay.getTime() === tomorrow.getTime()) return 'tomorrow';
  if (atDay >= today && atDay <= weekEnd) return 'week';
  return null;
}

interface ScheduleTimeStripProps {
  cards: CardType[];
  scheduledStatusId: string | null;
  filterText: string;
  onCardClick: (card: CardType) => void;
  className?: string;
}

export function ScheduleTimeStrip({
  cards,
  scheduledStatusId,
  filterText,
  onCardClick,
  className = '',
}: ScheduleTimeStripProps) {
  const scheduledCards = cards.filter(
    (c) => c.statusId === scheduledStatusId && c.scheduledAt
  );
  const matchesFilter = (card: CardType) =>
    filterText === '' ||
    card.title.toLowerCase().includes(filterText.toLowerCase());

  const todayCards = scheduledCards.filter(
    (c) => getCardBucket(c) === 'today' && matchesFilter(c)
  );
  const tomorrowCards = scheduledCards.filter(
    (c) => getCardBucket(c) === 'tomorrow' && matchesFilter(c)
  );
  const weekCards = scheduledCards.filter(
    (c) => getCardBucket(c) === 'week' && matchesFilter(c)
  );
  const totalScheduled = todayCards.length + tomorrowCards.length + weekCards.length;

  if (!scheduledStatusId) return null;

  const [scheduledExpanded, setScheduledExpanded] = useState(true);

  const bucketLabel = (label: string, count: number) => (
    <span className="flex items-center gap-2">
      <span>{label}</span>
      {count > 0 && (
        <span className="badge badge-sm badge-ghost font-bold">{count}</span>
      )}
    </span>
  );

  const renderCards = (list: CardType[], maxHeight = 'max-h-24') =>
    list.length === 0 ? (
      <p className="text-[10px] opacity-40 italic py-2">None</p>
    ) : (
      <ul className={`space-y-1 overflow-y-auto ${maxHeight}`}>
        {list.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => onCardClick(card)}
              className="text-left w-full text-xs font-bold truncate px-2 py-1.5 rounded-lg bg-base-200/80 hover:bg-primary/20 transition-colors"
              title={card.title}
            >
              {card.title}
            </button>
          </li>
        ))}
      </ul>
    );

  const bucketBlock = (
    label: string,
    count: number,
    list: CardType[],
    verticalMaxHeight = 'max-h-24'
  ) => (
    <div key={label} className="min-w-0">
      <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
        {bucketLabel(label, count)}
      </div>
      {renderCards(list, verticalMaxHeight)}
    </div>
  );

  return (
    <div
      className={`rounded-2xl border border-base-content/10 bg-base-100/60 overflow-hidden w-full ${className}`}
    >
        <button
          type="button"
          onClick={() => setScheduledExpanded((e) => !e)}
          className="w-full min-h-[56px] flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-semibold tracking-wide text-base-content/80 min-w-0">
              Scheduled
            </span>
            <span className="badge badge-sm badge-ghost font-bold">{totalScheduled}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] tracking-wide text-base-content/75">{scheduledExpanded ? 'Tap to collapse' : 'Tap to expand'}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`shrink-0 opacity-50 transition-transform ${scheduledExpanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>
        {scheduledExpanded && (
          <div className="flex flex-col gap-4 px-4 pb-4 pt-5 border-t border-base-content/10 w-full">
            {bucketBlock('Today', todayCards.length, todayCards, 'max-h-32')}
            {bucketBlock('Tomorrow', tomorrowCards.length, tomorrowCards, 'max-h-32')}
            {bucketBlock('This week', weekCards.length, weekCards, 'max-h-32')}
          </div>
        )}
      </div>
  );
}
