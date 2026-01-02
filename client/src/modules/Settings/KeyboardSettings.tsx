import { useState } from 'react';
import { useKeyboard, type ShortcutAction } from '../../context/KeyboardContext';

export const KeyboardSettings = () => {
  const { shortcuts, updateShortcut } = useKeyboard();
  const [editingAction, setEditingAction] = useState<ShortcutAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionLabels: Record<ShortcutAction, string> = {
    filter: 'Search / Filter Tasks',
    board_switch: 'Switch Board',
    new_card: 'Create New Card'
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: ShortcutAction) => {
    e.preventDefault();
    setError(null);
    
    // Ignore modifier keys if pressed alone
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    try {
      updateShortcut(action, e.key);
      setEditingAction(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <section className="card bg-base-100 shadow-xl border border-base-200 p-8">
      <h2 className="text-xl font-black mb-6 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
        Keyboard Shortcuts
      </h2>
      
      <div className="space-y-4">
        {(Object.keys(shortcuts) as ShortcutAction[]).map((action) => (
          <div key={action} className="flex items-center justify-between p-3 bg-base-200/50 rounded-lg">
            <div>
              <p className="font-bold">{actionLabels[action]}</p>
            </div>
            
            <div className="relative">
              {editingAction === action ? (
                <input
                  autoFocus
                  readOnly
                  value="Press a key..."
                  className="input input-sm input-primary w-24 text-center cursor-pointer"
                  onBlur={() => {
                    setEditingAction(null);
                    setError(null);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, action)}
                />
              ) : (
                <button 
                  onClick={() => setEditingAction(action)}
                  className="kbd kbd-md cursor-pointer hover:scale-110 transition-transform hover:border-primary"
                >
                  {shortcuts[action].toUpperCase()}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-error mt-4 py-2 text-sm font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}
    </section>
  );
};
