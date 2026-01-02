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
      className={`card bg-base-100 shadow-xl border-t-4 border-${board.colour || 'secondary'} hover:scale-[1.02] transition-transform overflow-hidden cursor-pointer group`}
    >
      <div className="card-body">
        <div className="flex justify-between items-start">
          <h2 className="card-title text-2xl font-black">{board.name}</h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(board);
            }}
            className="btn btn-circle btn-sm btn-ghost opacity-40 hover:opacity-100"
            title="Board Settings"
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
