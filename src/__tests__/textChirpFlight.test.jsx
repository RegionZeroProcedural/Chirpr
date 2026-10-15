import React, { useRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useTextChirpFlight } from '../components/useTextChirpFlight.js';

function TestStream({ media = false }) {
  const [posts, setPosts] = useState([]);
  const stream = useRef(null);
  const { begin, flight, pendingFlight, arrivingId, justPostedId } = useTextChirpFlight(stream, posts.map(p => p.id).join('|'));
  return <>
    <button onClick={() => {
      const post = { id: 'chirp-1', text: 'A thought', attachment: media ? { id: 'picture' } : null };
      setPosts([post]);
      begin(post, { top: 350, left: 50, width: 480 });
    }}>Publish</button>
    <div ref={stream}>
      {posts.map(p => <div key={p.id} data-chirp-entry-target={p.id} data-post-id={p.id}
        data-entrance={arrivingId === p.id ? 'awaiting' : justPostedId === p.id ? 'landed' : 'normal'}>{p.text}</div>)}
    </div>
    {flight && <span data-testid="flight" data-phase={flight.phase}>{flight.post.text}</span>}
    {pendingFlight && <span data-testid="pending">pending</span>}
  </>;
}

const originalMatch = window.matchMedia;
const originalRect = Element.prototype.getBoundingClientRect;
const originalRaf = window.requestAnimationFrame;
const originalCancel = window.cancelAnimationFrame;

beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = () => ({ matches: false });
  Element.prototype.getBoundingClientRect = () => ({ top: 690, left: 55, width: 520, height: 175 });
  window.requestAnimationFrame = cb => window.setTimeout(() => cb(0), 16);
  window.cancelAnimationFrame = id => window.clearTimeout(id);
});
afterEach(() => {
  jest.useRealTimers();
  window.matchMedia = originalMatch;
  Element.prototype.getBoundingClientRect = originalRect;
  window.requestAnimationFrame = originalRaf;
  window.cancelAnimationFrame = originalCancel;
});

test('plain-text posts fly from composer into the top of the stream, then reveal', () => {
  render(<TestStream />);
  fireEvent.click(screen.getByText('Publish'));
  expect(screen.getByTestId('flight').getAttribute('data-phase')).toBe('ready');
  expect(document.querySelector('[data-entrance="awaiting"]')).not.toBeNull();
  act(() => jest.advanceTimersByTime(40));
  expect(screen.getByTestId('flight').getAttribute('data-phase')).toBe('flying');
  act(() => jest.advanceTimersByTime(800));
  expect(screen.queryByTestId('flight')).toBeNull();
  expect(document.querySelector('[data-entrance="landed"]')).not.toBeNull();
});

test('media bypasses text-only flight and retains its independent upload path', () => {
  render(<TestStream media />);
  fireEvent.click(screen.getByText('Publish'));
  expect(screen.queryByTestId('flight')).toBeNull();
  expect(document.querySelector('[data-entrance="normal"]')).not.toBeNull();
});

test('reduced-motion viewers receive the new post without a flying clone', () => {
  window.matchMedia = () => ({ matches: true });
  render(<TestStream />);
  fireEvent.click(screen.getByText('Publish'));
  expect(screen.queryByTestId('flight')).toBeNull();
  expect(document.querySelector('[data-entrance="landed"]')).not.toBeNull();
});
