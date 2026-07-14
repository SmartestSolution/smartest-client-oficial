import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type Handlers = {
  onOpenSearch: () => void;
  onOpenHelp: () => void;
};

/**
 * Global keyboard shortcuts.
 *  - Cmd/Ctrl+K: open global search
 *  - ?         : open shortcuts help
 *  - g d       : go to Dashboard
 *  - g p       : focus Projects (dashboard)
 *  - g a       : Agenda Geral
 *  - g c       : Chat
 *  - g t       : Treinamentos
 */
export function useKeyboardShortcuts({ onOpenSearch, onOpenHelp }: Handlers) {
  const navigate = useNavigate();

  useEffect(() => {
    let lastKey: string | null = null;
    let lastTime = 0;

    const isTyping = (el: EventTarget | null) => {
      const target = el as HTMLElement | null;
      if (!target) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (target as HTMLElement).isContentEditable
      );
    };

    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K -> search (works even while typing)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
        return;
      }

      if (isTyping(e.target)) return;

      // ? -> help
      if (e.key === '?') {
        e.preventDefault();
        onOpenHelp();
        return;
      }

      // g + <key> combos
      const now = Date.now();
      if (lastKey === 'g' && now - lastTime < 800) {
        const map: Record<string, string> = {
          d: '/dashboard',
          a: '/agenda',
          c: '/chat',
          t: '/treinamentos',
          p: '/dashboard',
          s: '/perfil',
        };
        const path = map[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          navigate(path);
        }
        lastKey = null;
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        lastKey = 'g';
        lastTime = now;
      } else {
        lastKey = null;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onOpenSearch, onOpenHelp]);
}
