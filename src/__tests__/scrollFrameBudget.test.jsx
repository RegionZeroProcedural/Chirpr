import React, { useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useScrollFragments } from '../components/useScrollFragments.js';

function Stream() {
  const ref = useRef(null);
  useScrollFragments(ref, 'two-posts');
  return <div ref={ref}>{[1, 2].map(id => <div data-feed-card key={id}>
    <div className="feed-card__base">Post {id}</div>
    <div className="feed-card__shards">{Array.from({ length: 8 }, (_, i) =>
      <div className="feed-card__shard" key={i} />)}</div>
  </div>)}</div>;
}

const oldIO = global.IntersectionObserver;
const oldRAF = window.requestAnimationFrame;
const oldCAF = window.cancelAnimationFrame;
const oldMatchMedia = window.matchMedia;
let observer;
let frames;

beforeEach(() => {
  frames = [];
  global.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe() {}
    disconnect() {}
  };
  window.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  window.cancelAnimationFrame = jest.fn();
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => {
  global.IntersectionObserver = oldIO;
  window.requestAnimationFrame = oldRAF;
  window.cancelAnimationFrame = oldCAF;
  window.matchMedia = oldMatchMedia;
  observer = null;
});

test('reads all active card positions before writing animated styles', () => {
  const { container } = render(<Stream />);
  const cards = [...container.querySelectorAll('[data-feed-card]')];
  const order = [];
  cards.forEach((card, index) => {
    card.getBoundingClientRect = () => {
      order.push(`read-${index}`);
      return { top: 620 + index * 10, bottom: 820 + index * 10 };
    };
    const original = card.querySelector('.feed-card__shards').style.setProperty;
    card.querySelector('.feed-card__shards').style.setProperty = (...args) => {
      order.push(`write-${index}`);
      return original.apply(card.querySelector('.feed-card__shards').style, args);
    };
  });
  act(() => {
    observer.callback(cards.map(target => ({ target, isIntersecting: true })));
    frames.shift()();
  });
  expect(order.slice(0, 2)).toEqual(['read-0', 'read-1']);
  expect(order.some(item => item.startsWith('write'))).toBe(true);
});

test('does not mutate shard animation properties on unchanged scroll coordinates', () => {
  const { container } = render(<Stream />);
  const cards = [...container.querySelectorAll('[data-feed-card]')];
  cards.forEach(card => { card.getBoundingClientRect = () => ({ top: 645, bottom: 825 }); });
  act(() => {
    observer.callback(cards.map(target => ({ target, isIntersecting: true })));
    frames.shift()();
  });
  const layer = cards[0].querySelector('.feed-card__shards');
  const initial = layer.style.getPropertyValue('--assembly');
  const spy = jest.spyOn(layer.style, 'setProperty');
  act(() => {
    window.dispatchEvent(new Event('scroll'));
    frames.shift()();
  });
  expect(initial).not.toBe('');
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
