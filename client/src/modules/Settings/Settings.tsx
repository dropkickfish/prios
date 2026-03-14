import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { queryKeys } from '../../api/queryKeys';
import { ThemeController } from '../../components/ThemeController';
import { AccentController } from '../../components/AccentController';
import { KeyboardSettings } from './KeyboardSettings';
import { TriageSettings } from './TriageSettings';
import { ApiKeySettings } from './ApiKeySettings';

const shouldShowKeyboardSettings = () => {
  if (typeof window === 'undefined') return true;

  const isStandalonePwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    ((window.navigator as Navigator & { standalone?: boolean }).standalone ?? false);
  const isSmallScreen = window.matchMedia('(max-width: 767px)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  return !isStandalonePwa && !(isSmallScreen && isCoarsePointer);
};

export const Settings = () => {
  const queryClient = useQueryClient();
  const [isPollingForConnect, setIsPollingForConnect] = useState(false);
  const [showKeyboardSettings, setShowKeyboardSettings] = useState(shouldShowKeyboardSettings);

  const { data: authStatus, isLoading } = useQuery({
    queryKey: queryKeys.googleAuthStatus(),
    queryFn: apiClient.getGoogleAuthStatus,
    refetchInterval: (query) => {
      const connected = query.state.data?.connected ?? false;
      if (connected) return false;
      return isPollingForConnect ? 2000 : false;
    },
  });

  const connected = authStatus?.connected ?? false;

  useEffect(() => {
    if (connected && isPollingForConnect) {
      setIsPollingForConnect(false);
    }
  }, [connected, isPollingForConnect]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const screenSizeQuery = window.matchMedia('(max-width: 767px)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    const updateVisibility = () => {
      setShowKeyboardSettings(shouldShowKeyboardSettings());
    };

    updateVisibility();
    displayModeQuery.addEventListener('change', updateVisibility);
    screenSizeQuery.addEventListener('change', updateVisibility);
    pointerQuery.addEventListener('change', updateVisibility);

    return () => {
      displayModeQuery.removeEventListener('change', updateVisibility);
      screenSizeQuery.removeEventListener('change', updateVisibility);
      pointerQuery.removeEventListener('change', updateVisibility);
    };
  }, []);

  const disconnectMutation = useMutation({
    mutationFn: apiClient.disconnectGoogle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.googleAuthStatus() }),
  });

  const handleConnect = async () => {
    try {
      const { url } = await apiClient.getGoogleAuthUrl();
      setIsPollingForConnect(true);
      window.open(url, '_blank', 'width=600,height=600');
      // Stop polling after 2 minutes if user closes the auth flow.
      window.setTimeout(() => setIsPollingForConnect(false), 120000);
    } catch (error) {
      console.error('Failed to start Google auth flow:', error);
      setIsPollingForConnect(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google Calendar?')) {
      await disconnectMutation.mutateAsync();
    }
  };

  if (isLoading) return <div className="flex justify-center p-20"><span className="loading loading-spinner loading-lg"></span></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-10">
      <header>
        <h1 className="text-4xl font-bold text-base-content">Settings</h1>
        <p className="mt-1 text-base-content/65">Manage your integrations and preferences.</p>
      </header>

      <section className="rounded-xl border border-base-content/10 bg-base-100/80 p-7">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-base-content">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Google Calendar
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Sync your availability</p>
            <p className="text-sm text-base-content/65">Checking calendar for conflicts and auto-scheduling "Doing" tasks.</p>
          </div>

          {connected ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-success text-xs font-semibold uppercase tracking-[0.12em]">
                <span className="h-2 w-2 rounded-full bg-success"></span>
                Connected
              </div>
              <button onClick={handleDisconnect} className="btn btn-ghost btn-xs opacity-30 hover:opacity-100 hover:text-error">
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleConnect}
                disabled={isPollingForConnect}
                className="btn btn-primary rounded-lg border-none px-6 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPollingForConnect ? 'Connecting...' : 'Connect Calendar'}
              </button>
              {isPollingForConnect && (
                <p className="text-xs text-base-content/65">Waiting for Google sign-in confirmation...</p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-base-content/10 bg-base-100/80 p-7">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-base-content">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
          Appearance
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Application Theme</p>
            <p className="text-sm text-base-content/65">Select your preferred visual style.</p>
          </div>

          <ThemeController />
        </div>
        <div className="mt-6 border-t border-base-content/10 pt-6">
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-bold">Accent Color</p>
              <p className="text-sm text-base-content/65">Pick a personal accent without changing the clean base palette.</p>
            </div>
            <AccentController />
          </div>
        </div>
      </section>

      {showKeyboardSettings && <KeyboardSettings />}

      <ApiKeySettings />

      <TriageSettings />

      <section className="rounded-xl border border-base-content/10 bg-base-100/70 p-7 opacity-65 grayscale pointer-events-none">
        <h2 className="mb-6 text-xl font-semibold text-base-content">
           More integrations coming soon
        </h2>
        <p className="text-sm text-base-content/70">Slack, GitHub, and Jira integrations are in the works.</p>
      </section>
    </div>
  );
};
