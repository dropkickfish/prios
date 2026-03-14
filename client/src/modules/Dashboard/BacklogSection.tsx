import type { StatusType, CardType } from '../../types';
import { CardComponent } from '../../components/CardComponent';
import { DraggableCard, DroppableColumn } from './BoardViewParts';

interface BacklogSectionProps {
  statuses: StatusType[];
  getCardsByStatus: (id: string) => CardType[];
  backlogCollapsed: boolean;
  toggleSection: (section: 'backlog' | 'archive') => void;
  navigateToPrioritise: () => void;
  modalOpen: boolean;
  setSelectedStatusId: (id: string) => void;
  setShowCreateModal: (show: boolean) => void;
  onCardClick: (card: CardType) => void;
  onStatusChange: (cardId: string, statusId: string) => void;
  onSchedule: (card: CardType) => void;
}

export const BacklogSection = ({
  statuses,
  getCardsByStatus,
  backlogCollapsed,
  toggleSection,
  navigateToPrioritise,
  modalOpen,
  setSelectedStatusId,
  setShowCreateModal,
  onCardClick,
  onStatusChange,
  onSchedule,
}: BacklogSectionProps) => {
  const maybeStatus = statuses.find(s => s.category === 'maybe');
  if (!maybeStatus) return null;
  const todoCards = getCardsByStatus(maybeStatus.id);
  const backlogCount = todoCards.length;

  return (
    <div className="order-2 flex-shrink-0 flex flex-col gap-4 transition-all duration-300 w-full">
      {backlogCollapsed ? (
        <button
          type="button"
          onClick={() => toggleSection('backlog')}
          className="w-full min-h-[56px] rounded-xl bg-base-200/60 border border-base-content/10 flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold tracking-wide text-base-content/80">Backlog</span>
            <span className="badge badge-sm badge-ghost font-bold">{backlogCount}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] tracking-wide text-base-content/75">Tap to expand</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-45">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>
      ) : (
        <div className="flex flex-col gap-4 w-full min-w-0">
          <div className="flex items-center justify-between gap-2 w-full px-1">
            <button
              type="button"
              onClick={() => toggleSection('backlog')}
              className="btn btn-ghost h-11 min-h-11 px-3 rounded-xl gap-2 justify-start min-w-0"
              aria-label="Collapse backlog"
            >
              <span className="text-[11px] font-bold tracking-wide text-base-content/80">Backlog</span>
              <span className="badge badge-sm badge-ghost font-bold">{backlogCount}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <div className="flex items-center justify-end min-w-0">
              <button type="button" onClick={navigateToPrioritise} className="btn btn-sm h-11 min-h-11 btn-primary gap-1.5 shrink-0 px-4" title="Prioritise backlog (tinder-style swipe)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Prioritise backlog</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full min-w-0">
            <DroppableColumn statusId={maybeStatus.id}>
              {todoCards.map(card => (
                <DraggableCard key={card.id} card={card}>
                  <CardComponent
                    card={card}
                    statuses={statuses}
                    variant="backlog"
                    showActions={true}
                    onClick={() => !modalOpen && onCardClick(card)}
                    onStatusChange={(_, newStatusId) => onStatusChange(card.id, newStatusId)}
                    onSchedule={onSchedule}
                  />
                </DraggableCard>
              ))}
              <button
                disabled={modalOpen}
                onClick={() => { setSelectedStatusId(maybeStatus.id); setShowCreateModal(true); }}
                className="btn btn-ghost btn-sm py-3 opacity-50 hover:opacity-100 border-dashed border-2 border-base-content/20 rounded-xl w-full text-[10px] uppercase font-black"
              >
                + Add to to do
              </button>
            </DroppableColumn>
          </div>
        </div>
      )}
    </div>
  );
};
