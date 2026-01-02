import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';

export type ShortcutAction = 
  | 'filter' 
  | 'board_switch' 
  | 'new_card'
  | 'settings'
  | 'dashboard'
  | 'stats'
  | 'new_board'
  | 'board_1'
  | 'board_2'
  | 'board_3'
  | 'board_4'
  | 'board_5'
  | 'board_6'
  | 'board_7'
  | 'board_8'
  | 'board_9';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  alt?: boolean;
}

interface KeyboardContextType {
  shortcuts: Record<ShortcutAction, Shortcut>;
  updateShortcut: (action: ShortcutAction, shortcut: Shortcut) => void;
  registerShortcut: (action: ShortcutAction, callback: () => void) => void;
  unregisterShortcut: (action: ShortcutAction) => void;
}

const defaultShortcuts: Record<ShortcutAction, Shortcut> = {
  filter: { key: 'f' },
  board_switch: { key: 'j' },
  new_card: { key: 'k' },
  settings: { key: ',' },
  dashboard: { key: 'd' },
  stats: { key: 's' },
  new_board: { key: 'n' },
  board_1: { key: '1' },
  board_2: { key: '2' },
  board_3: { key: '3' },
  board_4: { key: '4' },
  board_5: { key: '5' },
  board_6: { key: '6' },
  board_7: { key: '7' },
  board_8: { key: '8' },
  board_9: { key: '9' },
};

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

const SHORTCUTS_VERSION = 2; // Increment this when defaults change significantly

export const KeyboardProvider = ({ children }: { children: ReactNode }) => {
  const [shortcuts, setShortcuts] = useState<Record<ShortcutAction, Shortcut>>(() => {
    const saved = localStorage.getItem('keyboard_shortcuts');
    const savedVersion = localStorage.getItem('keyboard_shortcuts_version');
    
    // If version doesn't match, reset to defaults
    if (savedVersion !== String(SHORTCUTS_VERSION)) {
      console.log('Shortcuts version mismatch, resetting to defaults');
      localStorage.setItem('keyboard_shortcuts_version', String(SHORTCUTS_VERSION));
      return defaultShortcuts;
    }
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrate old string-based shortcuts to new Shortcut format
        const migrated: Record<string, Shortcut> = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'string') {
            // Old format: just a string key
            migrated[key] = { key: value };
          } else if (value && typeof value === 'object' && 'key' in value) {
            // New format: already a Shortcut object
            migrated[key] = value as Shortcut;
          }
        }
        // Merge with defaults to ensure all actions exist
        return { ...defaultShortcuts, ...migrated };
      } catch (e) {
        console.error('Failed to parse shortcuts from localStorage:', e);
        return defaultShortcuts;
      }
    }
    return defaultShortcuts;
  });

  const callbacksRef = useRef<Partial<Record<ShortcutAction, () => void>>>({});
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    localStorage.setItem('keyboard_shortcuts', JSON.stringify(shortcuts));
    localStorage.setItem('keyboard_shortcuts_version', String(SHORTCUTS_VERSION));
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
      
      console.log('Key pressed:', e.key, 'Modifiers:', { ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey, alt: e.altKey });
      console.log('Registered callbacks:', Object.keys(callbacksRef.current));
      console.log('Available shortcuts:', currentShortcuts);

      const action = (Object.keys(currentShortcuts) as ShortcutAction[]).find(
        key => {
          const shortcut = currentShortcuts[key];
          
          // Safety check: skip if shortcut or key is undefined
          if (!shortcut || !shortcut.key) {
            console.warn(`Shortcut for ${key} is missing or invalid:`, shortcut);
            return false;
          }
          
          const keyMatches = shortcut.key.toLowerCase() === e.key.toLowerCase();
          
          // Only log for keys that match to reduce noise
          if (keyMatches) {
            console.log(`Key match found for action "${key}":`, shortcut);
            console.log(`Checking modifiers - shortcut:`, { ctrl: shortcut.ctrl, meta: shortcut.meta, shift: shortcut.shift, alt: shortcut.alt });
            console.log(`Checking modifiers - event:`, { ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey, alt: e.altKey });
          }
          
          const ctrlMatches = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
          const metaMatches = shortcut.meta ? e.metaKey : !e.metaKey;
          const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;
          const altMatches = shortcut.alt ? e.altKey : !e.altKey;

          // For shortcuts with meta OR ctrl (cross-platform), accept either
          if (shortcut.meta && shortcut.ctrl) {
            return keyMatches && (e.metaKey || e.ctrlKey) && shiftMatches && altMatches;
          }

          const matches = keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
          if (keyMatches) {
            console.log(`Match result for "${key}":`, { keyMatches, ctrlMatches, metaMatches, shiftMatches, altMatches, finalMatch: matches });
          }
          return matches;
        }
      );

      if (action && callbacksRef.current[action]) {
        console.log('Executing action:', action);
        e.preventDefault();
        callbacksRef.current[action]?.();
      } else {
        console.log('No action found for key:', e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateShortcut = (action: ShortcutAction, shortcut: Shortcut) => {
    // Check for duplicates
    const isDuplicate = Object.entries(shortcuts).some(([key, s]) => 
      key !== action &&
      s.key.toLowerCase() === shortcut.key.toLowerCase() &&
      !!s.ctrl === !!shortcut.ctrl &&
      !!s.meta === !!shortcut.meta &&
      !!s.shift === !!shortcut.shift &&
      !!s.alt === !!shortcut.alt
    );
    
    if (isDuplicate) {
      throw new Error(`This shortcut is already assigned to another action.`);
    }

    setShortcuts(prev => ({ ...prev, [action]: shortcut }));
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
