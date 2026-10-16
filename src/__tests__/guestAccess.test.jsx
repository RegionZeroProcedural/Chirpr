import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => require('react').createElement('a', { href: to, ...props }, children) }));
import Home from '../pages/home.jsx';
import Login from '../pages/login.jsx';
import Register from '../pages/register.jsx';
import { GUEST_MODE_KEY, GUEST_UID, GUEST_USER, isGuestMode } from '../data/guestSession.js';
import { SocialProvider, SOCIAL_STORAGE_KEY, useSocial } from '../features/social/SocialStore.jsx';

const originalMatchMedia = window.matchMedia;
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion: reduce'),
    addEventListener: () => {}, removeEventListener: () => {},
  }));
});
afterAll(() => { window.matchMedia = originalMatchMedia; });

test.each([
  ['Home', Home],
  ['Login', Login],
  ['Create Account', Register],
])('%s offers password-free guest entry using the login dissolve flow', (_, Page) => {
  const enterGuest = jest.fn();
  const regularSignIn = jest.fn();
  render(<Page onDemoSignIn={regularSignIn} onGuestSignIn={enterGuest} users={[]} />);
  const button = screen.getByRole('button', { name: 'Sign in as guest without an account' });
  expect(button.getAttribute('type')).toBe('button');
  // There are intentionally no credentials entered; guest must bypass validation.
  fireEvent.click(button);
  expect(enterGuest).toHaveBeenCalledTimes(1);
  expect(regularSignIn).not.toHaveBeenCalled();
});

test('guest identity is distinct from the existing demo accounts', () => {
  expect(GUEST_UID).not.toBe(1);
  expect(GUEST_USER.username).toBe('chirpr_guest');
  expect(GUEST_USER.isGuest).toBe(true);
  expect(isGuestMode(window.sessionStorage)).toBe(false);
  window.sessionStorage.setItem(GUEST_MODE_KEY, '1');
  expect(isGuestMode(window.sessionStorage)).toBe(true);
});

const demoPost = { id: 'sample-1', uid: 2, text: 'example' };
function Probe() {
  const social = useSocial();
  return <button type="button" onClick={() => social.reactToPost(demoPost, 'love')}>
    Reaction total: {social.reactionSummary(demoPost.id).total}
  </button>;
}
test('guest social reactions are temporary and do not overwrite saved demo account data', () => {
  const stored = JSON.stringify({ reactions: {}, notifications: [{ id: 'old', toUid: 1 }] });
  window.localStorage.setItem(SOCIAL_STORAGE_KEY, stored);
  render(<SocialProvider guestMode currentUser={GUEST_USER} users={[GUEST_USER]} posts={[demoPost]}><Probe /></SocialProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Reaction total: 0/ }));
  expect(screen.getByRole('button', { name: /Reaction total: 1/ })).toBeTruthy();
  expect(window.localStorage.getItem(SOCIAL_STORAGE_KEY)).toBe(stored);
});
