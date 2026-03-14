import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import type { BoardType } from '../../types';
import { CreateBoardModal } from './CreateBoardModal';
import { BoardSettingsModal } from './BoardSettingsModal';
import { useShortcut } from '../../context/KeyboardContext';

export { BoardView } from './BoardView';

const MAX_BOARDS = 9;

interface SortableBoardCardProps {
  board: BoardType;
  index: number;
  onEdit: (board: BoardType) => void;
}

const BOARD_ACCENT_BAR_CLASS: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  neutral: 'bg-neutral',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

const SortableBoardCard = ({ board, index, onEdit }: SortableBoardCardProps) => {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: board.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/boards/${board.id}`)}
      className="group relative rounded-xl border border-base-content/12 bg-base-100/80 transition-colors hover:border-base-content/25 cursor-pointer"
    >
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div className={`mt-1 h-10 w-1 opacity-60 ${BOARD_ACCENT_BAR_CLASS[board.colour || 'secondary'] || 'bg-secondary'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-base-content/45 font-semibold">Board {index + 1}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-base-content line-clamp-1">{board.name}</h2>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(board);
              }}
              className="btn btn-circle btn-sm w-9 h-9 min-h-9 btn-ghost opacity-45 hover:opacity-100"
              title="Board Settings"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-base-content/60">
            <span>{board.cardCounts?.doing ?? 0} in focus</span>
            <span>{board.cardCounts?.maybe ?? 0} in backlog</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/boards/${board.id}`);
              }}
              className="text-base-content/80 hover:text-base-content underline underline-offset-4 decoration-base-content/20 hover:decoration-base-content/50 transition-colors"
              onPointerDown={(e) => e.stopPropagation()}
            >
              Open board
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/boards/${board.id}/prioritise`);
              }}
              className="text-base-content/65 hover:text-base-content transition-colors"
              onPointerDown={(e) => e.stopPropagation()}
            >
              Prioritise
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/boards/${board.id}/execute`);
              }}
              className="text-primary hover:text-primary/80 transition-colors"
              onPointerDown={(e) => e.stopPropagation()}
            >
              Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardType | null>(null);

  const { data: boards = [], isLoading } = useQuery<BoardType[]>({
    queryKey: queryKeys.boards(),
    queryFn: apiClient.getBoards,
  });

  const reorderMutation = useMutation({
    mutationFn: (reordered: { id: string; order: number }[]) =>
      apiClient.reorderBoards(reordered),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.boards() }),
  });

  const invalidateBoards = () => queryClient.invalidateQueries({ queryKey: queryKeys.boards() });

  // Dashboard-specific shortcuts
  useShortcut('new_board', () => {
    if (boards.length < MAX_BOARDS) {
      setShowCreateModal(true);
    }
  });

  // Board jump shortcuts (1-9)
  useShortcut('board_1', () => boards[0] && navigate(`/boards/${boards[0].id}`));
  useShortcut('board_2', () => boards[1] && navigate(`/boards/${boards[1].id}`));
  useShortcut('board_3', () => boards[2] && navigate(`/boards/${boards[2].id}`));
  useShortcut('board_4', () => boards[3] && navigate(`/boards/${boards[3].id}`));
  useShortcut('board_5', () => boards[4] && navigate(`/boards/${boards[4].id}`));
  useShortcut('board_6', () => boards[5] && navigate(`/boards/${boards[5].id}`));
  useShortcut('board_7', () => boards[6] && navigate(`/boards/${boards[6].id}`));
  useShortcut('board_8', () => boards[7] && navigate(`/boards/${boards[7].id}`));
  useShortcut('board_9', () => boards[8] && navigate(`/boards/${boards[8].id}`));

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = boards.findIndex(b => b.id === active.id);
      const newIndex = boards.findIndex(b => b.id === over?.id);
      const newOrder = arrayMove(boards, oldIndex, newIndex);

      // Optimistic update
      queryClient.setQueryData(queryKeys.boards(), newOrder);

      reorderMutation.mutate(newOrder.map((board, index) => ({
        id: board.id,
        order: index,
      })));
    }
  };

  const canCreateBoard = boards.length < MAX_BOARDS;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 text-secondary-content">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-base-content/50">Workspace</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-base-content">Boards</h1>
            <p className="text-sm text-base-content/65 mt-1">Choose a board, then move into focused execution.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-outline border-base-content/20 text-base-content h-11 min-h-11 px-5 hover:border-primary/40 hover:text-primary"
            disabled={!canCreateBoard}
            title={!canCreateBoard ? `Maximum ${MAX_BOARDS} boards reached` : 'Create New Board (N)'}
          >
            New Board
          </button>
        </div>
        <p className="text-xs text-base-content/50">
          {boards.length}/{MAX_BOARDS} boards · {boards.reduce((sum, b) => sum + (b.cardCounts?.doing ?? 0), 0)} tasks in focus · {boards.reduce((sum, b) => sum + (b.cardCounts?.maybe ?? 0), 0)} in backlog
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <span className="loading loading-ring loading-lg text-primary"></span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={boards.map(b => b.id)}
            strategy={rectSortingStrategy}
          >
           <div className="grid grid-cols-1 gap-3 text-base-content">
              {boards.map((board, index) => (
                <SortableBoardCard
                  key={board.id}
                  board={board}
                  index={index}
                  onEdit={setEditingBoard}
                />
              ))}
              {boards.length === 0 && (
                <div className="col-span-full text-center p-16 bg-base-100/70 rounded-2xl border border-dashed border-base-content/25 flex flex-col items-center gap-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 opacity-20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  <div>
                    <p className="text-xl font-black opacity-60">No boards yet</p>
                    <p className="text-sm opacity-40 mt-1 max-w-xs mx-auto">Boards hold your tasks. Collect work, triage it, then execute one task at a time.</p>
                  </div>
                  <button onClick={() => setShowCreateModal(true)} className="btn btn-primary mt-2">Create your first board</button>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!canCreateBoard && (
        <div className="alert alert-warning shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>You've reached the maximum of {MAX_BOARDS} boards. Delete a board to create a new one.</span>
        </div>
      )}

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            invalidateBoards();
          }}
        />
      )}

      {editingBoard && (
        <BoardSettingsModal
          board={editingBoard}
          onClose={() => setEditingBoard(null)}
          onUpdated={invalidateBoards}
          onDeleted={() => {
            setEditingBoard(null);
            invalidateBoards();
          }}
        />
      )}
    </div>
  );
};
