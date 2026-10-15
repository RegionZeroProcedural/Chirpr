import { useCallback, useEffect, useRef, useState } from 'react';

// Keep the post in the DOM until its fragments have flown away, then commit
// delete/hide to the shared local data. Protect against double-clicks.
export function usePostDestruction(onDelete, onHide) {
  const [destroying, setDestroying] = useState({});
  const timers = useRef(new Map());
  const pending = useRef(new Map());
  const actions = useRef({ onDelete, onHide });
  actions.current = { onDelete, onHide };

  useEffect(() => () => {
    // If the user leaves during destruction, still commit the confirmed action.
    timers.current.forEach(timer => clearTimeout(timer));
    timers.current.clear();
    pending.current.forEach(({ id, type }) => {
      if (type === 'deleted') actions.current.onDelete?.(id);
      else actions.current.onHide?.(id);
    });
    pending.current.clear();
  }, []);

  const begin = useCallback((id, type) => {
    const key = String(id);
    if (timers.current.has(key)) return;
    pending.current.set(key, { id, type });
    setDestroying(previous => ({ ...previous, [key]: type }));
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const timer = window.setTimeout(() => {
      pending.current.delete(key);
      timers.current.delete(key);
      if (type === 'deleted') actions.current.onDelete?.(id);
      else actions.current.onHide?.(id);
      setDestroying(previous => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
    }, reduceMotion ? 290 : 1470);
    timers.current.set(key, timer);
  }, []);

  return {
    destroying,
    animateDelete: useCallback(id => begin(id, 'deleted'), [begin]),
    animateHide: useCallback(id => begin(id, 'hidden'), [begin])
  };
}
