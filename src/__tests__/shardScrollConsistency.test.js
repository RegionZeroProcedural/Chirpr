import { getScrollShardProgress } from '../components/useScrollFragments.js';

const viewport = 800;
const position = (top, height = 220) => ({ top, bottom: top + height });

test('a normal post assembles below the viewport and disperses at the top', () => {
  expect(getScrollShardProgress(position(850), viewport).progress).toBe(0);
  expect(getScrollShardProgress(position(440), viewport).progress).toBe(1);
  expect(getScrollShardProgress(position(-300), viewport).progress).toBe(0);
});

test('a tall media post assembles fully while it spans the viewport', () => {
  const tall = 1150;
  expect(getScrollShardProgress(position(850, tall), viewport).progress).toBe(0);
  expect(getScrollShardProgress(position(720, tall), viewport).progress).toBeGreaterThan(0);
  expect(getScrollShardProgress(position(280, tall), viewport).progress).toBe(1);
  expect(getScrollShardProgress(position(-650, tall), viewport).progress).toBe(1);
  expect(getScrollShardProgress(position(-1030, tall), viewport).progress).toBeLessThan(1);
});

test('reversing a scroll location produces exactly the same progress', () => {
  const intermediate = position(665, 220);
  const first = getScrollShardProgress(intermediate, viewport);
  getScrollShardProgress(position(490, 220), viewport);
  expect(getScrollShardProgress(intermediate, viewport)).toEqual(first);
});

test('prefers-reduced-motion always displays fully assembled posts', () => {
  expect(getScrollShardProgress(position(900), viewport, true, true).progress).toBe(1);
  expect(getScrollShardProgress(position(-1200), viewport, false, true).progress).toBe(1);
});
