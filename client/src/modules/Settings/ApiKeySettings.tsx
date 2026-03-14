import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export const ApiKeySettings = () => {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['apiKeyStatus'],
    queryFn: apiClient.getApiKeyStatus,
  });

  const rotateMutation = useMutation({
    mutationFn: apiClient.rotateApiKey,
    onSuccess: (result) => {
      setNewKey(result.key);
      setCopied(false);
      queryClient.invalidateQueries({ queryKey: ['apiKeyStatus'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteApiKey,
    onSuccess: () => {
      setNewKey(null);
      queryClient.invalidateQueries({ queryKey: ['apiKeyStatus'] });
    },
  });

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = () => {
    if (data?.configured && !confirm('This will invalidate the current key. Continue?')) return;
    rotateMutation.mutate();
  };

  const handleDelete = () => {
    if (!confirm('Remove the API key? All external clients will lose access.')) return;
    deleteMutation.mutate();
  };

  return (
    <section className="rounded-xl border border-base-content/10 bg-base-100/80 p-7">
      <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-base-content">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        API Key
      </h2>
      <p className="mb-6 text-sm text-base-content/65">Bearer token for external clients and LLM integrations.</p>

      {isLoading ? (
        <span className="loading loading-spinner loading-sm" />
      ) : data?.source === 'env' ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">Managed via environment variable</p>
            <p className="mt-0.5 font-mono text-sm text-base-content/60">{data.preview}</p>
            <p className="mt-1 text-xs text-base-content/45">Set <code className="text-xs">API_KEY</code> in <code className="text-xs">server/.env</code> to rotate.</p>
          </div>
          <div className="flex items-center gap-2 text-success text-xs font-semibold uppercase tracking-[0.12em]">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            Active
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              {data?.configured ? (
                <>
                  <p className="font-bold">Key configured</p>
                  <p className="mt-0.5 font-mono text-sm text-base-content/60">{data.preview}</p>
                </>
              ) : (
                <>
                  <p className="font-bold">No key configured</p>
                  <p className="mt-0.5 text-sm text-base-content/60">All non-localhost requests pass through unauthenticated.</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {data?.configured && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="btn btn-ghost btn-xs opacity-40 hover:opacity-100 hover:text-error"
                >
                  Remove
                </button>
              )}
              <button
                onClick={handleRotate}
                disabled={rotateMutation.isPending}
                className="btn btn-primary btn-sm rounded-lg border-none"
              >
                {rotateMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : data?.configured ? 'Rotate Key' : 'Generate Key'}
              </button>
            </div>
          </div>

          {newKey && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-warning uppercase tracking-wide">Copy this key — it won't be shown again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-base-200 px-3 py-2 text-xs break-all font-mono text-base-content/80">
                  {newKey}
                </code>
                <button onClick={handleCopy} className="btn btn-ghost btn-sm shrink-0">
                  {copied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-base-content/50">Set <code className="text-xs">VITE_API_KEY</code> in <code className="text-xs">client/.env</code> to the same value if you're also accessing via the browser.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
