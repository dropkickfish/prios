import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './modules/Dashboard/Dashboard';
import { Execute } from './modules/Execute/Execute';

function App() {
  const [view, setView] = useState<'dashboard' | 'execute'>('dashboard');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const handleOpenExecute = (boardId: string) => {
    setSelectedBoardId(boardId);
    setView('execute');
  };

  return (
    <Layout currentView={view} onNavigate={(v) => setView(v as any)}>
      {view === 'dashboard' && <Dashboard onOpenExecute={handleOpenExecute} />}
      {view === 'execute' && selectedBoardId && (
        <Execute boardId={selectedBoardId} onBack={() => setView('dashboard')} />
      )}
    </Layout>
  );
}

export default App;
