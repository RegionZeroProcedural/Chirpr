import { useLayoutEffect } from 'react';
import './shardConsistency.css';
import './shardPerformance.css';

const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = n => n * n * (3 - 2 * n);

// Fallback geometry for browsers without IntersectionObserver or for the
// brief moment before the nearby-card observer has delivered its first entry.
export const SHARDS = [
  { path: 'polygon(0% 0%, 50% 0%, 0% 50%)', dx: -93, dy: 122, turn: -17 },
  { path: 'polygon(50% 0%, 50% 50%, 0% 50%)', dx: 72, dy: 156, turn: 11 },
  { path: 'polygon(50% 0%, 100% 0%, 50% 50%)', dx: -39, dy: 186, turn: -13 },
  { path: 'polygon(100% 0%, 100% 50%, 50% 50%)', dx: 108, dy: 91, turn: 19 },
  { path: 'polygon(0% 50%, 50% 50%, 0% 100%)', dx: -125, dy: 95, turn: 13 },
  { path: 'polygon(50% 50%, 50% 100%, 0% 100%)', dx: 47, dy: 163, turn: -19 },
  { path: 'polygon(50% 50%, 100% 50%, 50% 100%)', dx: -62, dy: 107, turn: 16 },
  { path: 'polygon(100% 50%, 100% 100%, 50% 100%)', dx: 133, dy: 167, turn: -12 }
];

function reshuffle(card, compact) {
  const shards = card.querySelectorAll('.feed-card__shard');
  const count = compact ? 4 : 8;
  if (shards.length < count) return false;
  const jitter = (min, max) => min + Math.random() * (max - min);
  const pct = n => `${n.toFixed(2)}%`;
  const center = [jitter(40, 60), jitter(40, 60)];
  const boundary = compact
    ? [[0, 0], [100, 0], [100, 100], [0, 100]]
    : [[0, 0], [jitter(28, 72), 0], [100, 0], [100, jitter(28, 72)],
       [100, 100], [jitter(28, 72), 100], [0, 100], [0, jitter(28, 72)]];
  const point = ([x, y]) => `${pct(x)} ${pct(y)}`;
  const centerPoint = point(center);
  shards.forEach((shard, i) => {
    if (i >= count) return;
    // Border vertices are shared: shards always join without gaps, even when
    // their pattern is regenerated on the next completed assembly cycle.
    shard.style.clipPath = `polygon(${centerPoint}, ${point(boundary[i])}, ${point(boundary[(i + 1) % count])})`;
    const side = i % 2 ? 1 : -1;
    const x = jitter(compact ? 36 : 42, compact ? 94 : 158) * side + jitter(-18, 18);
    const y = jitter(compact ? 62 : 82, compact ? 148 : 224);
    const turn = jitter(compact ? 5 : 9, compact ? 15 : 39) * (Math.random() > 0.5 ? 1 : -1);
    shard.style.setProperty('--shard-x', `${x.toFixed(1)}px`);
    shard.style.setProperty('--shard-y', `${y.toFixed(1)}px`);
    shard.style.setProperty('--shard-angle', `${turn.toFixed(1)}deg`);
    shard.style.setProperty('--shard-scale', jitter(compact ? .89 : .78, .97).toFixed(3));
  });
  return true;
}

// Measure each edge independently. A tall media card can span BOTH animation
// zones at once: using min(bottomProgress, topProgress) kept those posts
// permanently fragmented. Instead, animate only while the relevant edge
// actually crosses its zone; hold the card fully assembled in between.
export function getScrollShardProgress(rect, height, compact = false, reduced = false) {
  if (reduced) return { progress: 1, edge: 'bottom' };
  const bottomEnd = height - Math.min(compact ? 245 : 265, height * .33);
  const bottomStart = height - 12;
  const topStart = Math.min(compact ? 185 : 200, height * .23);
  const topEnd = -Math.min(85, height * .10);
  if (rect.top > bottomEnd) {
    return { progress: smooth(clamp((bottomStart - rect.top) / (bottomStart - bottomEnd))), edge: 'bottom' };
  }
  if (rect.bottom < topStart) {
    return { progress: smooth(clamp((rect.bottom - topEnd) / (topStart - topEnd))), edge: 'top' };
  }
  return { progress: 1, edge: 'center' };
}

// The post's position, not scroll direction, drives its animation. Reversing
// the scroll reverses the *same* pattern until the cycle finishes.
// Measure only nearby posts and batch updates within animation frames.
export function useScrollFragments(listRef, changeKey) {
  useLayoutEffect(() => {
    const container = listRef.current;
    if (!container) return undefined;
    const cards = Array.from(container.querySelectorAll('[data-feed-card]'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = window.matchMedia('(max-width: 700px), (pointer: coarse)');
    const states = new WeakMap();
    let frame = 0;
    let stableHeight = window.innerHeight;
    let stableWidth = window.innerWidth;
    let observer = null;
    // Let IntersectionObserver populate this set. For very long streams we
    // should never measure every card just because React rendered the feed.
    const active = new Set();
    const compact = () => compactQuery.matches;

    function paint() {
      frame = 0;
      if (document.hidden) return;
      const isCompact = compact();
      const noMotion = reduced.matches;
      const height = isCompact ? stableHeight : window.innerHeight;
      const reads = [];

      // READ PHASE: never interleave geometry reads with style writes.
      // Previously setting styles on card #1 could force layout when measuring
      // card #2 (a classic scroll-triggered reflow / jank source).
      for (const card of active) {
        if (!card.isConnected || card.classList.contains('feed-card--destroying')) continue;
        const rect = card.getBoundingClientRect();
        const state = states.get(card);
        // Query for a newly mounted layer only when its presence may change.
        // MutationObserver schedules repaint when the lazy layer appears.
        const layer = state?.layer?.isConnected ? state.layer : card.querySelector('.feed-card__shards');
        reads.push({ card, layer, result: getScrollShardProgress(rect, height, isCompact, noMotion) });
      }

      // WRITE PHASE: update compositor-friendly values only on the shard
      // layer, not on the whole post (which contains media and glass effects).
      for (const { card, layer, result } of reads) {
        const { progress, edge } = result;
        const fromTopEdge = edge === 'top';
        let state = states.get(card);
        if (!state) {
          state = { zone: progress >= .9999 ? 'solid' : progress <= .0001 ? 'hidden' : 'moving',
            compact: isCompact, edge: fromTopEdge, last: '', layer: null, ready: null, animating: null };
          states.set(card, state);
        }
        const layerChanged = state.layer !== layer || state.compact !== isCompact;
        if (layerChanged) {
          state.layer = layer;
          state.compact = isCompact;
          if (!noMotion && layer) reshuffle(card, isCompact);
          state.last = '';
        }
        if (!noMotion) {
          if (state.zone === 'solid' && progress < .95) {
            state.zone = 'moving';
            state.edge = fromTopEdge;
          } else if (state.zone === 'hidden' && progress > .035) {
            state.zone = 'moving';
            state.edge = fromTopEdge;
          }
          if (state.zone === 'moving' && (progress >= .9999 || progress <= .0001)) {
            state.edge = fromTopEdge;
            state.zone = progress >= .9999 ? 'solid' : 'hidden';
            // A new random geometry is selected only after finishing a cycle;
            // reversing mid-scroll always returns the SAME shards.
            if (layer) reshuffle(card, isCompact);
          }
        }
        const ready = !noMotion && !!layer;
        const readyValue = noMotion ? 'no-motion' : ready ? 'yes' : 'waiting';
        if (readyValue !== state.ready) {
          state.ready = readyValue;
          card.dataset.ready = readyValue;
        }
        const animating = ready && progress > .004 && progress < .999 ? 'yes' : 'no';
        if (animating !== state.animating) {
          state.animating = animating;
          card.dataset.animating = animating;
        }
        if (!ready) continue;
        // The true post starts cross-fading sooner than it used to, so content
        // is readable during assembly. This reduces expensive translucent
        // overlapping layers and keeps the transition visually continuous.
        const base = smooth(clamp((progress - .48) / .52));
        const alpha = (1 - base) * clamp(progress * 5);
        const p = progress.toFixed(isCompact ? 2 : 3);
        const signature = `${p}|${base.toFixed(2)}|${alpha.toFixed(2)}|${state.edge}`;
        if (signature === state.last) continue;
        state.last = signature;
        // Scope CSS variable invalidation to 8 light shards, not to the media,
        // post text, and every other descendant of the parent card.
        layer.style.setProperty('--assembly', p);
        layer.style.setProperty('--shard-alpha', alpha.toFixed(2));
        layer.style.setProperty('--edge-sign', state.edge ? '-1' : '1');
        const baseNode = card.querySelector('.feed-card__base');
        if (baseNode) baseNode.style.setProperty('--base-alpha', base.toFixed(2));
      }
    }
    function update() {
      if (!frame) frame = window.requestAnimationFrame(paint);
    }
    function onResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Mobile browser address-bar animation should not make shards jitter.
      if (Math.abs(width - stableWidth) > 3 || Math.abs(height - stableHeight) > 110) {
        stableWidth = width;
        stableHeight = height;
      }
      update();
    }

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) active.add(target);
          else active.delete(target);
        });
        update();
      }, { rootMargin: '320px 0px', threshold: 0 });
      cards.forEach(card => observer.observe(card));
    } else {
      cards.forEach(card => active.add(card));
      paint();
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener?.('change', update);
    compactQuery.addEventListener?.('change', onResize);
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    resize?.observe(container);
    const shardMounts = typeof MutationObserver !== 'undefined' ? new MutationObserver(records => {
      if (records.some(record => Array.from(record.addedNodes).concat(Array.from(record.removedNodes))
        .some(node => node.nodeType === 1 && node.classList?.contains('feed-card__shards')))) update();
    }) : null;
    shardMounts?.observe(container, { subtree: true, childList: true });
    const finish = window.setTimeout(update, 1100);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(finish);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener?.('change', update);
      compactQuery.removeEventListener?.('change', onResize);
      resize?.disconnect();
      shardMounts?.disconnect();
      observer?.disconnect();
    };
  }, [listRef, changeKey]);
}
