import { useEffect, useRef } from 'react';

const KEY_GAP = 60;

export function useCardReader(enabled: boolean, onRead: (value: string) => void, ignoreNestedModal = false) {
  const buffer = useRef('');
  const last = useRef(0);
  const cb = useRef(onRead);

  useEffect(() => {
    cb.current = onRead;
  }, [onRead]);

  useEffect(() => {
    if (!enabled) return;
    buffer.current = '';
    const onKey = (e: KeyboardEvent) => {
      if (ignoreNestedModal && document.querySelectorAll('.modal.show').length > 1) return;
      const now = performance.now();
      if (now - last.current > KEY_GAP) buffer.current = '';
      last.current = now;
      if (e.key === 'Enter') {
        const value = buffer.current;
        buffer.current = '';
        if (value.length >= 8) {
          e.preventDefault();
          cb.current(value);
        }
        return;
      }
      if (e.key.length === 1 && /[0-9a-fA-F]/.test(e.key)) buffer.current += e.key;
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [enabled, ignoreNestedModal]);
}
