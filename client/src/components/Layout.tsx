import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-base-200" data-theme="winter">
      <div className="navbar bg-base-100 shadow-sm px-4">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl font-bold gap-2">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="18" width="20" height="20" rx="4" transform="rotate(-10 10 18)" fill="#C6B3D3"/>
              <rect x="12" y="12" width="20" height="20" rx="4" transform="rotate(-5 12 12)" fill="#A3E1E7"/>
              <rect x="15" y="5" width="20" height="20" rx="4" fill="#3BD3E4"/>
            </svg>
            Prios
          </a>
        </div>
        <div className="flex-none gap-2">
          <ul className="menu menu-horizontal px-1">
            <li><a>Dashboard</a></li>
            <li><a>Settings</a></li>
          </ul>
        </div>
      </div>
      <main className="p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};
