import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './modules/Dashboard/Dashboard';
import { Execute } from './modules/Execute/Execute';
import { BoardView } from './modules/Dashboard/BoardView';
import { Prioritise } from './modules/Prioritise/Prioritise';
import { Stats } from './modules/Stats/Stats';
import { Settings } from './modules/Settings/Settings';

// ... imports
import { KeyboardProvider, useShortcut } from './context/KeyboardContext';

function AppContent() {
  const [view, setView] = useState<'dashboard' | 'execute' | 'board' | 'prioritise' | 'stats' | 'settings'>('dashboard');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // Global navigation shortcuts
  useShortcut('settings', () => setView('settings'));
  useShortcut('dashboard', () => setView('dashboard'));
  useShortcut('stats', () => setView('stats'));

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
        <BoardView 
          boardId={selectedBoardId} 
          onBack={() => setView('dashboard')} 
          onOpenPrioritise={() => handleOpenPrioritise(selectedBoardId)}
          onSwitchBoard={(newBoardId) => setSelectedBoardId(newBoardId)}
        />
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

function App() {
  return (
    <KeyboardProvider>
      <AppContent />
    </KeyboardProvider>
  );
}

export default App;

