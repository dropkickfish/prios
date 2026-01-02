import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './modules/Dashboard/Dashboard';
import { Execute } from './modules/Execute/Execute';
import { BoardView } from './modules/Dashboard/BoardView';
import { Prioritise } from './modules/Prioritise/Prioritise';
import { Stats } from './modules/Stats/Stats';
import { Settings } from './modules/Settings/Settings';

function App() {
  const [view, setView] = useState<'dashboard' | 'execute' | 'board' | 'prioritise' | 'stats' | 'settings'>('dashboard');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const handleOpenExecute = (boardId: string) => {
    setSelectedBoardId(boardId);
    setView('execute');
  };

  const handleOpenBoard = (boardId: string) => {
    setSelectedBoardId(boardId);
    setView('board');
  };

  const handleOpenPrioritise = (boardId: string) => {
    setSelectedBoardId(boardId);
    setView('prioritise');
  };

  return (
    <Layout currentView={view} onNavigate={(v) => setView(v as any)}>
      {view === 'dashboard' && (
        <Dashboard 
          onOpenExecute={handleOpenExecute} 
          onOpenBoard={handleOpenBoard} 
          onOpenPrioritise={handleOpenPrioritise} 
        />
      )}
      {view === 'board' && selectedBoardId && (
        <BoardView boardId={selectedBoardId} onBack={() => setView('dashboard')} />
      )}
      {view === 'execute' && selectedBoardId && (
        <Execute boardId={selectedBoardId} onBack={() => setView('dashboard')} />
      )}
      {view === 'prioritise' && selectedBoardId && (
        <Prioritise 
          boardId={selectedBoardId} 
          onBack={() => setView('dashboard')} 
          onViewExecute={() => setView('execute')}
        />
      )}
      {view === 'stats' && <Stats />}
      {view === 'settings' && <Settings />}
    </Layout>
  );
}

export default App;
