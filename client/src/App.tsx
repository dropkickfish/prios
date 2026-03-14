import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './modules/Dashboard/Dashboard';
import { Execute } from './modules/Execute/Execute';
import { BoardView } from './modules/Dashboard/BoardView';
import { Prioritise } from './modules/Prioritise/Prioritise';
import { Stats } from './modules/Stats/Stats';
import { Settings } from './modules/Settings/Settings';
import { Login } from './pages/Login';
import { KeyboardProvider, useShortcut } from './context/KeyboardContext';
import { AuthProvider, useAuth, setAuthFailureHandler } from './context/AuthContext';

function AppRoutes() {
  const navigate = useNavigate();
  const { needsLogin, triggerLogin } = useAuth();

  // Wire API client 401s to the auth context
  setAuthFailureHandler(triggerLogin);

  useShortcut('settings', () => navigate('/settings'));
  useShortcut('dashboard', () => navigate('/'));
  useShortcut('stats', () => navigate('/stats'));

  if (needsLogin) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/boards/:boardId" element={<BoardView />} />
        <Route path="/boards/:boardId/execute" element={<Execute />} />
        <Route path="/boards/:boardId/prioritise" element={<Prioritise />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <KeyboardProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </KeyboardProvider>
    </AuthProvider>
  );
}

export default App;
