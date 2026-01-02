import { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
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
import type { BoardType } from '../../types';
import { CreateBoardModal } from './CreateBoardModal';
import { BoardSettingsModal } from './BoardSettingsModal';

export { BoardView } from './BoardView';

interface DashboardProps {
  onOpenExecute: (boardId: string) => void;
  onOpenBoard: (boardId: string) => void;
  onOpenPrioritise: (boardId: string) => void;
}

interface SortableBoardCardProps {
  board: BoardType;
  onOpenExecute: (boardId: string) => void;
  onOpenBoard: (boardId: string) => void;
  onOpenPrioritise: (boardId: string) => void;
  onEdit: (board: BoardType) => void;
}

const SortableBoardCard = ({ board, onOpenExecute, onOpenBoard, onOpenPrioritise, onEdit }: SortableBoardCardProps) => {
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
      onClick={() => onOpenBoard(board.id)}
      className="card bg-base-100 shadow-xl border-t-4 border-secondary hover:scale-[1.02] transition-transform overflow-hidden cursor-pointer group"
    >
      <div className="card-body">
        <div className="flex justify-between items-start">
          <h2 className="card-title text-2xl font-black">{board.name}</h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(board);
            }}
            className="btn btn-circle btn-xs btn-ghost opacity-20 hover:opacity-100"
            title="Board Settings"
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
          >
            ⚙️
          </button>
        </div>
        <p className="opacity-70 text-sm">Productivity hub for {board.name}.</p>
        <div className="card-actions justify-end mt-6 gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenBoard(board.id);
            }} 
            className="btn btn-sm btn-outline opacity-50 hover:opacity-100"
            onPointerDown={(e) => e.stopPropagation()}
          >
            View Board
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenPrioritise(board.id);
            }} 
            className="btn btn-sm btn-secondary text-white border-none shadow-md shadow-secondary/10"
            onPointerDown={(e) => e.stopPropagation()}
          >
            Prioritise
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenExecute(board.id);
            }} 
            className="btn btn-sm btn-primary text-white border-none shadow-md shadow-primary/30"
            onPointerDown={(e) => e.stopPropagation()}
          >
            Execute
          </button>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = ({ onOpenExecute, onOpenBoard, onOpenPrioritise }: DashboardProps) => {
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts to prevent accidental drags on click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    setLoading(true);
    const data = await apiClient.getBoards();
    setBoards(data);
    setLoading(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setBoards((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Persist order
        apiClient.reorderBoards(newOrder.map((board, index) => ({
          id: board.id,
          order: index
        })));

        return newOrder;
      });
    }
  };

  return (
    <div className="space-y-8 text-secondary-content">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-primary">Dashboard</h1>
          <p className="opacity-60 text-base-content">Manage your boards and track your progress.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary shadow-lg shadow-primary/20 text-white border-none">Create New Board</button>
      </div>

      {loading ? (
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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base-content">
              {boards.map(board => (
                <SortableBoardCard 
                  key={board.id} 
                  board={board} 
                  onOpenBoard={onOpenBoard}
                  onOpenExecute={onOpenExecute}
                  onOpenPrioritise={onOpenPrioritise}
                  onEdit={setEditingBoard}
                />
              ))}
              {boards.length === 0 && (
                <div className="col-span-full text-center p-20 bg-base-100 rounded-3xl border-2 border-dashed border-base-300">
                   <p className="text-xl opacity-40 font-bold uppercase tracking-widest">No boards found</p>
                   <button onClick={() => setShowCreateModal(true)} className="btn btn-ghost btn-sm mt-4">Create your first board</button>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {showCreateModal && (
        <CreateBoardModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={(newBoard) => setBoards([...boards, newBoard])}
        />
      )}

      {editingBoard && (
        <BoardSettingsModal 
          board={editingBoard}
          onClose={() => setEditingBoard(null)}
          onUpdated={fetchBoards}
        />
      )}
    </div>
  );
};
