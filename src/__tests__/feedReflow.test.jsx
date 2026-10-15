import React, { useRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { useFeedReflow } from '../components/useFeedReflow.js';

function DemoList() {
  const [posts, setPosts] = useState(['one', 'two', 'three']);
  const listRef = useRef(null);
  const { captureBeforeRemoval } = useFeedReflow(listRef, posts.join('|'));
  return <>
    <button type="button" onClick={() => { captureBeforeRemoval(); setPosts(old => old.filter(post => post !== 'one')); }}>Delete first</button>
    <div ref={listRef}>{posts.map(post => <div key={post} data-post-id={post} data-feed-card>{post}</div>)}</div>
  </>;
}

const originalRect = Element.prototype.getBoundingClientRect;
const originalAnimate = Element.prototype.animate;
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const index = [...(this.parentElement?.children || [])].indexOf(this);
    const top = index * 125;
    return { top, left: 0, right: 300, bottom: top + 100, width: 300, height: 100 };
  };
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  Element.prototype.animate = jest.fn().mockImplementation(() => ({ cancel: jest.fn(), onfinish: null }));
});

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalRect;
  Element.prototype.animate = originalAnimate;
  window.matchMedia = originalMatchMedia;
});

test('surviving posts ease from their old Y coordinates to the new layout', () => {
  const { getByRole, getByText, queryByText } = render(<DemoList />);
  act(() => fireEvent.click(getByRole('button', { name: 'Delete first' })));
  expect(queryByText('one')).toBeNull();
  expect(getByText('two').animate).toHaveBeenCalledWith(
    [{ transform: 'translate3d(0px, 125px, 0)' }, { transform: 'translate3d(0, 0, 0)' }],
    expect.objectContaining({ duration: 590, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
  );
  expect(getByText('three').animate).toHaveBeenCalledTimes(2);
});

test('honors reduced motion and never animates new posts on initial mount', () => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: true });
  const { getByRole, getByText } = render(<DemoList />);
  expect(getByText('two').animate).not.toHaveBeenCalled();
  fireEvent.click(getByRole('button', { name: 'Delete first' }));
  expect(getByText('two').animate).not.toHaveBeenCalled();
});
