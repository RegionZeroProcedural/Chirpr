import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import './textChirpPosting.css';

// Text-only chirps have their own composer-to-wall animation. Media posts use
// the separate asynchronous paper-airplane pipeline and never enter this hook.
// Keep the post in the shared dataset immediately, but conceal its feed face
// until the travelling copy has finished joining the wall.
export function useTextChirpFlight(streamRef, postKey) {
  const [pending, setPending] = useState(null);
  const [flight, setFlight] = useState(null);
  const [arrivingId, setArrivingId] = useState(null);
  const [justPostedId, setJustPostedId] = useState(null);

  const begin = useCallback((post, sourceRect) => {
    if (!post || post.attachment || post.media) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (!sourceRect || sourceRect.width <= 0 || reduceMotion) {
      setJustPostedId(post.id);
      return;
    }
    setArrivingId(post.id);
    setPending({ post, from: { top: sourceRect.top, left: sourceRect.left, width: sourceRect.width } });
  }, []);

  // LayoutEffect measures the new post after React commits the state update.
  // The data-chirp-entry-target marker avoids accidentally measuring a nested
  // clipped/shattered duplicate of the same post.
  useLayoutEffect(() => {
    if (!pending) return;
    const target = Array.from(streamRef.current?.querySelectorAll('[data-chirp-entry-target]') || [])
      .find(node => node.getAttribute('data-chirp-entry-target') === String(pending.post.id));
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setFlight({
      post: pending.post,
      from: pending.from,
      x: rect.left - pending.from.left,
      y: rect.top - pending.from.top,
      scale: rect.width / pending.from.width,
      phase: 'ready'
    });
    setPending(null);
  }, [pending, postKey, streamRef]);

  // If a post cannot be located (e.g. the route changes or the list is
  // filtered while publishing), never leave a ghost or a disabled composer.
  useEffect(() => {
    if (!pending) return undefined;
    const timer = window.setTimeout(() => {
      setArrivingId(null);
      setJustPostedId(pending.post.id);
      setPending(null);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [pending]);

  useEffect(() => {
    if (flight?.phase !== 'ready') return undefined;
    let next = 0;
    const frame = window.requestAnimationFrame(() => {
      next = window.requestAnimationFrame(() => setFlight(previous =>
        previous?.post.id === flight.post.id ? { ...previous, phase: 'flying' } : previous));
    });
    return () => { window.cancelAnimationFrame(frame); window.cancelAnimationFrame(next); };
  }, [flight]);

  useEffect(() => {
    if (flight?.phase !== 'flying') return undefined;
    const timer = window.setTimeout(() => {
      setFlight(null);
      setArrivingId(null);
      setJustPostedId(flight.post.id);
    }, 780);
    return () => window.clearTimeout(timer);
  }, [flight]);

  useEffect(() => {
    if (justPostedId == null) return undefined;
    const timer = window.setTimeout(() => setJustPostedId(null), 950);
    return () => window.clearTimeout(timer);
  }, [justPostedId]);

  const reset = useCallback(() => {
    setPending(null);
    setFlight(null);
    setArrivingId(null);
    setJustPostedId(null);
  }, []);

  return { begin, flight, pendingFlight: pending, arrivingId, justPostedId, reset };
}
