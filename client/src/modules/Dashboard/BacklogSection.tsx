import type { StatusType, CardType } from '../../types';
import { CardComponent } from '../../components/CardComponent';
import { DraggableCard, DroppableColumn } from './BoardViewParts';

interface BacklogSectionProps {
  statuses: StatusType[];
  getCardsByStatus: (id: string) => CardType[];
  collapsedCategories: string[];
  backlogCollapsed: boolean;
  toggleSection: (section: 'backlog' | 'archive') => void;
  toggleColumn: (category: string) => void;
  boardId: string;
  navigateToPrioritise: () => void;
  modalOpen: boolean;
  setSelectedStatusId: (id: string) => void;
  setShowCreateModal: (show: boolean) => void;
  onCardClick: (card: CardType) => void;
  onStatusChange: (cardId: string, statusId: string) => void;
  onSchedule: (card: CardType) => void;
  statusDisplayName: (status: StatusType) => string;
}

export const BacklogSection = ({
  statuses,
  getCardsByStatus,
  collapsedCategories,
  backlogCollapsed,
  toggleSection,
  toggleColumn,
  navigateToPrioritise,
  modalOpen,
  setSelectedStatusId,
  setShowCreateModal,
  onCardClick,
  onStatusChange,
  onSchedule,
  statusDisplayName,
}: BacklogSectionProps) => {
  const maybeStatus = statuses.find(s => s.category === 'maybe');
  const schedStatus = statuses.find(s => s.category === 'scheduled');
  const backlogStatuses = [maybeStatus, schedStatus].filter(Boolean) as StatusType[];
  const backlogCount = backlogStatuses.reduce((sum, s) => sum + getCardsByStatus(s.id).length, 0);

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
              <button type="button" onClick={navigateToPrioritise} className="btn btn-sm h-11 min-h-11 btn-ghost gap-1.5 opacity-80 hover:opacity-100 shrink-0" title="Prioritise backlog (tinder-style swipe)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                <span className="text-[10px] font-bold uppercase">Prioritise</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full min-w-0">
            {backlogStatuses.map(status => {
              const isCollapsed = collapsedCategories.includes(status.category);
              return (
                <div key={status.id} className="flex flex-col gap-3 flex-shrink-0 transition-all w-full min-w-0">
                  <div className="flex items-center justify-between gap-2 px-1 w-full">
                    <button type="button" onClick={() => toggleColumn(status.category)} className="btn btn-ghost h-11 min-h-11 px-3 rounded-xl gap-2 text-left min-w-0 justify-start">
                      <span className="text-[11px] font-semibold tracking-wide text-base-content/80">{statusDisplayName(status)}</span>
                      <span className="badge badge-ghost badge-sm font-bold">{getCardsByStatus(status.id).length}</span>
                      <span className="text-[10px] uppercase tracking-wide opacity-45 hidden sm:inline">{isCollapsed ? 'Expand' : 'Collapse'}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`opacity-50 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
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
                            onClick={() => !modalOpen && onCardClick(card)}
                            onStatusChange={(_, newStatusId) => onStatusChange(card.id, newStatusId)}
                            onSchedule={onSchedule}
                          />
                        </DraggableCard>
                      ))}
                      {status.category === 'maybe' && (
                        <button
                          disabled={modalOpen}
                          onClick={() => { setSelectedStatusId(status.id); setShowCreateModal(true); }}
                          className="btn btn-ghost btn-sm py-3 opacity-40 hover:opacity-100 border-dashed border-2 border-base-content/20 rounded-xl w-full text-[10px] uppercase font-black"
                        >
                          + Add
                        </button>
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
};
