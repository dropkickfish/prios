import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { ThemeController } from '../../components/ThemeController';
import { KeyboardSettings } from './KeyboardSettings';

export const Settings = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getGoogleAuthStatus().then(data => {
      setConnected(data.connected);
      setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    const { url } = await apiClient.getGoogleAuthUrl();
    window.open(url, '_blank', 'width=600,height=600');
    
    // Simple polling to check if connected (in a real app, use postMessage or SSE)
    const interval = setInterval(async () => {
      const { connected: nowConnected } = await apiClient.getGoogleAuthStatus();
      if (nowConnected) {
        setConnected(true);
        clearInterval(interval);
      }
    }, 2000);
    
    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google Calendar?')) {
      await apiClient.disconnectGoogle();
      setConnected(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-12">
      <header>
        <h1 className="text-4xl font-black text-primary">Settings</h1>
        <p className="opacity-60">Manage your integrations and preferences.</p>
      </header>

      <section className="card bg-base-100 shadow-xl border border-base-200 p-8">
        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Google Calendar
        </h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Sync your availability</p>
            <p className="text-sm opacity-50">Checking calendar for conflicts and auto-scheduling "Doing" tasks.</p>
          </div>
          
          {connected ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-success font-black uppercase text-xs">
                <span className="h-2 w-2 bg-success rounded-full animate-pulse"></span>
                Connected
              </div>
              <button onClick={handleDisconnect} className="btn btn-ghost btn-xs opacity-30 hover:opacity-100 hover:text-error">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={handleConnect} className="btn btn-primary rounded-2xl shadow-lg shadow-primary/20 border-none px-6">
              Connect Calendar
            </button>
          )}
        </div>
      </section>

      <section className="card bg-base-100 shadow-xl border border-base-200 p-8">
        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
          Appearance
        </h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Application Theme</p>
            <p className="text-sm opacity-50">Select your preferred visual style.</p>
          </div>
          
          <ThemeController />
        </div>
      </section>

      <KeyboardSettings />

      <section className="card bg-base-100 shadow-xl border border-base-200 p-8 opacity-40 grayscale pointer-events-none">
        <h2 className="text-xl font-black mb-6 flex items-center gap-2">
           🔒 More Integrations Coming Soon
        </h2>
        <p className="text-sm">Slack, GitHub, and Jira integrations are in the works.</p>
      </section>
    </div>
  );
};
