import React from 'react';
import { act, render } from '@testing-library/react';
import { FragmentChirp } from '../pages/feed.jsx';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => require('react').createElement('a', { href: to, ...props }, children) }));

const post = { id: 'test-post', uid: 1, text: 'hello chirpr', age: 'now', topic: 'Test', replies: 0, likes: 0, shares: 0 };
const author = { uid: 1, username: 'keegan', displayName: 'Keegan' };
const originalObserver = global.IntersectionObserver;
const originalMatchMedia = window.matchMedia;
let callback;

beforeEach(() => {
  global.IntersectionObserver = class {
    constructor(next) { callback = next; }
    observe() {}
    disconnect() {}
  };
  window.matchMedia = jest.fn().mockImplementation(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
  global.IntersectionObserver = originalObserver;
  window.matchMedia = originalMatchMedia;
  callback = null;
});

function card(props) {
  return <FragmentChirp post={post} author={author} appearance={null} liked={false} onLike={() => {}} {...props} />;
}

test('offscreen text posts avoid expensive cloned glass shards until close to the viewport', () => {
  const { container } = render(card({}));
  expect(container.querySelectorAll('.feed-card__shard')).toHaveLength(0);
  act(() => callback([{ isIntersecting: true }]));
  expect(container.querySelectorAll('.feed-card__shard')).toHaveLength(8);
  expect(container.querySelectorAll('.feed-card__shard .feed-chirp')).toHaveLength(0);
  act(() => callback([{ isIntersecting: false }]));
  expect(container.querySelectorAll('.feed-card__shard')).toHaveLength(0);
});

test('media uploads still shard, but never replicate a video or image player', () => {
  const { container } = render(card({ post: { ...post, attachment: {
    id: 'media-1', kind: 'video', moderation: { status: 'pending_review' }
  } } }));
  act(() => callback([{ isIntersecting: true }]));
  expect(container.querySelectorAll('.feed-card__shard')).toHaveLength(8);
  expect(container.querySelectorAll('.feed-card__shard video, .feed-card__shard img')).toHaveLength(0);
  expect(container.querySelectorAll('.feed-card__shard-paint')).toHaveLength(8);
  expect(container.querySelectorAll('.feed-card__shard .feed-chirp')).toHaveLength(0);
  expect(container.querySelectorAll('.feed-card__base .chirpr-attachment')).toHaveLength(1);
  expect(container.querySelector('.feed-card').getAttribute('data-has-media')).toBe('yes');
});

test('small screens use four fragments rather than eight', () => {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 700px'), addEventListener() {}, removeEventListener() {}
  }));
  const { container } = render(card({}));
  act(() => callback([{ isIntersecting: true }]));
  expect(container.querySelectorAll('.feed-card__shard')).toHaveLength(4);
});
