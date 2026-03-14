import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface ApiKey {
  id: string;
  name: string;
  hint: string;
  expiresAt: number | null;
  lastUsedAt: number | null;
  createdAt: number;
}

function formatDate(ms: number | null): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ApiKeySettings = () => {
  const queryClient = useQueryClient();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createName, setCreateName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['apiKeys'],
    queryFn: apiClient.listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiClient.createApiKey({ name }),
    onSuccess: (result) => {
      setNewKey(result.key);
      setNewKeyName(result.name);
      setCopied(false);
      setCreateName('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apiKeys'] }),
  });

  const handleCopy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    createMutation.mutate(createName.trim());
  };

  const handleDelete = (key: ApiKey) => {
    if (!confirm(`Revoke "${key.name}"? Any clients using this key will lose access.`)) return;
    deleteMutation.mutate(key.id);
  };

  // Legacy env var key
  const envKeyActive = import.meta.env.VITE_API_KEY;

  return (
    <section className="rounded-xl border border-base-content/10 bg-base-100/80 p-7 space-y-6">
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-base-content">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Personal Access Tokens
        </h2>
        <p className="text-sm text-base-content/65">Bearer tokens for external clients, scripts, and LLM integrations. Each token can be revoked independently.</p>
      </div>

      {envKeyActive && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
          <p className="font-semibold text-warning">Legacy key active</p>
          <p className="mt-0.5 text-base-content/60">
            <code className="text-xs">VITE_API_KEY</code> is set. This global key still works but won't appear in this list. Migrate to a named token above when convenient.
          </p>
        </div>
      )}

      {isLoading ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <div className="space-y-2">
          {keys.length === 0 && !showCreate && (
            <p className="text-sm text-base-content/50">No tokens yet.</p>
          )}

          {keys.map(key => (
            <div key={key.id} className="flex items-center justify-between rounded-lg border border-base-content/8 bg-base-200/40 px-4 py-3 gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{key.name}</p>
                <p className="text-xs text-base-content/50 mt-0.5 font-mono">****{key.hint}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-xs text-base-content/45">
                <span title="Last used">
                  {key.lastUsedAt ? `Used ${formatDate(key.lastUsedAt)}` : 'Never used'}
                </span>
                {key.expiresAt && (
                  <span title="Expires" className={key.expiresAt < Date.now() ? 'text-error' : ''}>
                    {key.expiresAt < Date.now() ? 'Expired' : `Expires ${formatDate(key.expiresAt)}`}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(key)}
                  disabled={deleteMutation.isPending}
                  className="btn btn-ghost btn-xs opacity-40 hover:opacity-100 hover:text-error"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate ? (
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            className="input input-sm input-bordered flex-1"
            placeholder="Token name (e.g. MCP server)"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!createName.trim() || createMutation.isPending}
            className="btn btn-primary btn-sm"
          >
            {createMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : 'Create'}
          </button>
          <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm">
            Cancel
          </button>
        </form>
      ) : (
        <button onClick={() => setShowCreate(true)} className="btn btn-outline btn-sm rounded-lg">
          New token
        </button>
      )}

      {newKey && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-warning uppercase tracking-wide">
            Copy "{newKeyName}" — it won't be shown again
          </p>
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
          <button onClick={() => setNewKey(null)} className="text-xs text-base-content/40 hover:text-base-content/70">
            I've copied it, dismiss
          </button>
        </div>
      )}
    </section>
  );
};
