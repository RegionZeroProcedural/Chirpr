import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import './feedReflow.css';

// FLIP (First / Last / Invert / Play): after the post's self-destruct effect
// completes, animate the surviving posts from their *old screen positions*
// to their new layout positions. The list still uses normal document flow:
// nothing is permanently translated or absolutely positioned.
function getItems(container) {
  if (!container) return [];
  return Array.from(container.children).filter(element =>
    element.hasAttribute('data-post-id') &&
    (element.hasAttribute('data-feed-card') || element.hasAttribute('data-feed-reflow-item'))
  );
}

export function useFeedReflow(listRef, postKey) {
  const beforeRemoval = useRef(null);
  const active = useRef(new Map());

  const captureBeforeRemoval = useCallback(() => {
    const container = listRef.current;
    if (!container) return;
    // Capture before onDelete/onHide changes the shared React state.
    beforeRemoval.current = new Map(getItems(container).map(element => [
      element.getAttribute('data-post-id'), element.getBoundingClientRect()
    ]));
  }, [listRef]);

  useLayoutEffect(() => {
    const previous = beforeRemoval.current;
    if (!previous) return;
    beforeRemoval.current = null;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
    const viewportHeight = window.innerHeight;
    const container = listRef.current;

    getItems(container).forEach(element => {
      const first = previous.get(element.getAttribute('data-post-id'));
      if (!first) return; // Newly created posts have their own entrance animation.

      // If a second removal happens during the first transition, pick up
      // from the survivor's current visual position, not its stale layout.
      const oldAnimation = active.current.get(element);
      if (oldAnimation) {
        oldAnimation.cancel();
        active.current.delete(element);
      }

      const last = element.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      // Do not composite dozens of cards far off screen on mobile.
      if (last.bottom < -viewportHeight * 0.2 || last.top > viewportHeight * 1.2) return;
      if (typeof element.animate !== 'function') return;

      const animation = element.animate([
        { transform: `translate3d(${dx}px, ${dy}px, 0)` },
        { transform: 'translate3d(0, 0, 0)' }
      ], {
        duration: 590,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both'
      });
      element.classList.add('feed-reflow--moving');
      active.current.set(element, animation);

      const finish = () => {
        if (active.current.get(element) !== animation) return;
        active.current.delete(element);
        element.classList.remove('feed-reflow--moving');
        animation.cancel(); // Remove fill so scrolling/fragment effects own the card again.
      };
      animation.onfinish = finish;
    });
  }, [listRef, postKey]);

  useEffect(() => () => {
    active.current.forEach((animation, element) => {
      animation.cancel();
      element.classList.remove('feed-reflow--moving');
    });
    active.current.clear();
  }, []);

  return { captureBeforeRemoval };
}
