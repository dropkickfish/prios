import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './modules/Dashboard/Dashboard';
import { Execute } from './modules/Execute/Execute';
import { BoardView } from './modules/Dashboard/BoardView';

function App() {
  const [view, setView] = useState<'dashboard' | 'execute' | 'board'>('dashboard');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const handleOpenExecute = (boardId: string) => {
    setSelectedBoardId(boardId);
    setView('execute');
  };

  const handleOpenBoard = (boardId: string) => {
    setSelectedBoardId(boardId);
    setView('board');
  };

  return (
    <Layout currentView={view} onNavigate={(v) => setView(v as 'dashboard' | 'execute' | 'board')}>
      {view === 'dashboard' && <Dashboard onOpenExecute={handleOpenExecute} onOpenBoard={handleOpenBoard} />}
      {view === 'board' && selectedBoardId && (
        <BoardView boardId={selectedBoardId} onBack={() => setView('dashboard')} />
      )}
      {view === 'execute' && selectedBoardId && (
        <Execute boardId={selectedBoardId} onBack={() => setView('dashboard')} />
      )}
    </Layout>
  );
}

export default App;
