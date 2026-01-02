import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { BoardType } from '../../types';

export { BoardView } from './BoardView';

interface DashboardProps {
  onOpenExecute: (boardId: string) => void;
  onOpenBoard: (boardId: string) => void;
  onOpenPrioritise: (boardId: string) => void;
}

export const Dashboard = ({ onOpenExecute, onOpenBoard, onOpenPrioritise }: DashboardProps) => {
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getBoards().then(data => {
      setBoards(data);
      setLoading(false);
    });
  }, []);

  const handleCreateBoard = async () => {
    const name = prompt('Enter board name:');
    if (!name) return;
    const newBoard = await apiClient.createBoard({ 
      name, 
      availabilitySchedule: { mon: ["09:00-17:00"] } 
    });
    setBoards([...boards, newBoard]);
  };

  return (
    <div className="space-y-8 text-secondary-content">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-primary">Dashboard</h1>
          <p className="opacity-60 text-base-content">Manage your boards and track your progress.</p>
        </div>
        <button onClick={handleCreateBoard} className="btn btn-primary shadow-lg shadow-primary/20 text-white border-none">Create New Board</button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <span className="loading loading-ring loading-lg text-primary"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-base-content">
          {boards.map(board => (
            <div key={board.id} className="card bg-base-100 shadow-xl border-t-4 border-secondary hover:scale-[1.02] transition-transform overflow-hidden">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <h2 className="card-title text-2xl font-black">{board.name}</h2>
                </div>
                <p className="opacity-70 text-sm">Productivity hub for {board.name}.</p>
                <div className="card-actions justify-end mt-6 gap-3">
                  <button onClick={() => onOpenBoard(board.id)} className="btn btn-sm btn-outline opacity-50 hover:opacity-100">View Board</button>
                  <button onClick={() => onOpenPrioritise(board.id)} className="btn btn-sm btn-secondary text-white border-none shadow-md shadow-secondary/10">Prioritise</button>
                  <button onClick={() => onOpenExecute(board.id)} className="btn btn-sm btn-primary text-white border-none shadow-md shadow-primary/30">Execute</button>
                </div>
              </div>
            </div>
          ))}
          {boards.length === 0 && (
            <div className="col-span-full text-center p-20 bg-base-100 rounded-3xl border-2 border-dashed border-base-300">
               <p className="text-xl opacity-40 font-bold uppercase tracking-widest">No boards found</p>
               <button onClick={handleCreateBoard} className="btn btn-ghost btn-sm mt-4">Create your first board</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
