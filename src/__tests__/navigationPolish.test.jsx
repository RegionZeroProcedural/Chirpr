import React from 'react';
import { render, screen } from '@testing-library/react';
import { destinationForPath } from '../components/DestinationTransitions.jsx';
import LinkedPostText from '../components/LinkedPostText.jsx';
import MentionTextarea from '../components/MentionTextarea.jsx';
import SignOutTransition from '../components/SignOutTransition.jsx';

// CRA's older Jest resolver does not understand React Router 7's package
// subpath exports; these tiny mocks test our presentation, not RR internals.
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    Link: ({ to, children, ...props }) => React.createElement('a', { href:to, ...props }, children),
    useLocation: () => ({ pathname:'/feed', key:'test' })
  };
});

const destinations = [
  ['/feed','feed'], ['/discover','discover'], ['/reels','reels'],
  ['/groups/community','groups'], ['/messages/12','messages'],
  ['/notifications','activity'], ['/bookmarks','saved'],
  ['/chirp/post-1','thread'], ['/tags/art','tag'],
  ['/settings','settings'], ['/safety','safety'], ['/users/james','profile'],
  ['/account','profile'], ['/login','login'], ['/register','register'],
  ['/about','about'], ['/','home']
];

test.each(destinations)('route %s gets destination signature %s', (path, expected) => {
  expect(destinationForPath(path)).toBe(expected);
});

test('posted @mentions are medium-blue links distinct from hashtags', () => {
  const { container } = render(<LinkedPostText text="Hey @james, welcome to #chirpr" />);
  expect(screen.getByText('@james').getAttribute('href')).toBe('/users/james');
  expect(screen.getByText('@james').className).toContain('chirpr-inline-tag--mention');
  expect(screen.getByText('#chirpr').getAttribute('href')).toBe('/tags/chirpr');
  expect(container.querySelectorAll('a')).toHaveLength(2);
});

test('writing @mention preserves a native editable textarea and paints name separately', () => {
  const { container } = render(<MentionTextarea value="Hello @james" onChange={() => {}} aria-label="Post" />);
  expect(screen.getByRole('textbox', { name:'Post' }).value).toBe('Hello @james');
  expect(container.querySelector('.chirpr-mention-editor__mirror [class=chirpr-editor-mention]').textContent).toBe('@james');
  expect(container.querySelectorAll('textarea')).toHaveLength(1);
});


test('sign-out transition only creates the farewell overlay when activated', () => {
  const { rerender } = render(<SignOutTransition active={false} />);
  expect(document.querySelector('.chirpr-signout')).toBeNull();
  rerender(<SignOutTransition active />);
  expect(document.querySelector('.chirpr-signout__message').textContent).toMatch(/Until the next thought/);
  rerender(<SignOutTransition active={false} />);
  expect(document.querySelector('.chirpr-signout')).toBeNull();
});
