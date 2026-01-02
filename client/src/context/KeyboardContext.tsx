import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';

export type ShortcutAction = 'filter' | 'board_switch' | 'new_card';

interface KeyboardContextType {
  shortcuts: Record<ShortcutAction, string>;
  updateShortcut: (action: ShortcutAction, key: string) => void;
  registerShortcut: (action: ShortcutAction, callback: () => void) => void;
  unregisterShortcut: (action: ShortcutAction) => void;
}

const defaultShortcuts: Record<ShortcutAction, string> = {
  filter: 'f',
  board_switch: 'j',
  new_card: 'k',
};

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const KeyboardProvider = ({ children }: { children: ReactNode }) => {
  const [shortcuts, setShortcuts] = useState<Record<ShortcutAction, string>>(() => {
    const saved = localStorage.getItem('keyboard_shortcuts');
    return saved ? { ...defaultShortcuts, ...JSON.parse(saved) } : defaultShortcuts;
  });

  const callbacksRef = useRef<Partial<Record<ShortcutAction, () => void>>>({});
  const shortcutsRef = useRef(shortcuts); // Keep a ref to shortcuts for the event listener

  // Update shortcutsRef whenever shortcuts state changes
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Persist shortcuts when they change
  useEffect(() => {
    localStorage.setItem('keyboard_shortcuts', JSON.stringify(shortcuts));
  }, [shortcuts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const currentShortcuts = shortcutsRef.current;
      const action = (Object.keys(currentShortcuts) as ShortcutAction[]).find(
        key => currentShortcuts[key].toLowerCase() === e.key.toLowerCase()
      );

      if (action && callbacksRef.current[action]) {
        e.preventDefault();
        callbacksRef.current[action]?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array - stable listener!

  const updateShortcut = (action: ShortcutAction, key: string) => {
    // Basic validation: one character only for now
    if (key.length !== 1) return;
    
    // Check for duplicates
    const isDuplicate = Object.values(shortcuts).some(k => k.toLowerCase() === key.toLowerCase());
    if (isDuplicate) {
      throw new Error(`Key "${key}" is already assigned to another action.`);
    }

    setShortcuts(prev => ({ ...prev, [action]: key }));
  };

  const registerShortcut = (action: ShortcutAction, callback: () => void) => {
    callbacksRef.current[action] = callback;
  };

  const unregisterShortcut = (action: ShortcutAction) => {
    delete callbacksRef.current[action];
  };

  return (
    <KeyboardContext.Provider value={{ shortcuts, updateShortcut, registerShortcut, unregisterShortcut }}>
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};

export const useShortcut = (action: ShortcutAction, callback: () => void, enabled = true) => {
  const { registerShortcut, unregisterShortcut } = useKeyboard();

  useEffect(() => {
    if (!enabled) return;
    registerShortcut(action, callback);
    return () => unregisterShortcut(action);
  }, [action, callback, enabled, registerShortcut, unregisterShortcut]);
};
