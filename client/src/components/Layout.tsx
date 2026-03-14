import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <div className="navbar bg-base-100 shadow-sm px-4 shrink-0">
        <div className="flex-1">
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-ghost text-xl font-bold gap-2 cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="18" width="20" height="20" rx="4" transform="rotate(-10 10 18)" className="fill-secondary/50"/>
              <rect x="12" y="12" width="20" height="20" rx="4" transform="rotate(-5 12 12)" className="fill-primary/40"/>
              <rect x="15" y="5" width="20" height="20" rx="4" className="fill-primary"/>
            </svg>
            Prios
          </button>
        </div>
        <div className="flex-none gap-2">
          <ul className="hidden md:flex menu menu-horizontal px-1 font-bold uppercase text-xs tracking-widest opacity-70">
            <li>
              <NavLink to="/" className={({ isActive }) => isActive ? 'text-primary' : ''}>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/stats" className={({ isActive }) => isActive ? 'text-primary' : ''}>
                Stats
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={({ isActive }) => isActive ? 'text-primary' : ''}>
                Settings
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
      <main className="p-4 md:p-8 pb-20 md:pb-8 flex-1 min-h-0 flex flex-col">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-base-content/10 flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-base-content/55'}`
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-base-content/55'}`
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <span>Stats</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-primary' : 'text-base-content/55'}`
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
};
