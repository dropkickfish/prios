import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  currentView?: string;
  onNavigate?: (view: string) => void;
}

export const Layout = ({ children, currentView, onNavigate }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <a onClick={() => onNavigate?.('dashboard')} className="btn btn-ghost text-xl font-bold gap-2 cursor-pointer">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="18" width="20" height="20" rx="4" transform="rotate(-10 10 18)" fill="#C6B3D3"/>
              <rect x="12" y="12" width="20" height="20" rx="4" transform="rotate(-5 12 12)" fill="#A3E1E7"/>
              <rect x="15" y="5" width="20" height="20" rx="4" fill="#3BD3E4"/>
            </svg>
            Prios
          </a>
        </div>
        <div className="flex-none gap-2">
          <ul className="menu menu-horizontal px-1 font-bold uppercase text-xs tracking-widest opacity-70">
            <li><a onClick={() => onNavigate?.('dashboard')} className={currentView === 'dashboard' ? 'text-primary' : ''}>Dashboard</a></li>
            <li><a onClick={() => onNavigate?.('stats')} className={currentView === 'stats' ? 'text-primary' : ''}>Stats</a></li>
            <li><a onClick={() => onNavigate?.('settings')} className={currentView === 'settings' ? 'text-primary' : ''}>Settings</a></li>
          </ul>
        </div>
      </div>
      <main className="p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};
