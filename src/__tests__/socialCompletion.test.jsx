import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => require('react').createElement('a', { href: to, ...props }, children), useLocation: () => ({ pathname: '/feed' }) }));
import { SocialProvider, normalizeSocial, SOCIAL_STORAGE_KEY, useSocial } from '../features/social/SocialStore.jsx';
import { SocialPostActions } from '../features/social/SocialUI.jsx';
import { makeGroup } from '../data/localGroups.js';

const users = [
  { uid:1, username:'keegan', displayName:'Keegan' },
  { uid:2, username:'james', displayName:'James' }
];
const post = {id:'t-01', uid:2, text:'hello', age:'now', likes:0, replies:0, shares:0};
function SocialProbe() {
  const social = useSocial();
  return <div>
    <span data-testid="liked">{social.liked(post.id) ? 'yes' : 'no'}</span>
    <span data-testid="following">{social.following(2) ? 'yes' : 'no'}</span>
    <span data-testid="replies">{social.repliesFor(post.id).length}</span>
    <span data-testid="notifications">{social.state.notifications.length}</span>
    <button onClick={() => social.toggleLike(post)}>Like</button>
    <button onClick={() => social.toggleFollow(2)}>Follow</button>
    <button onClick={() => social.addReply(post,'a thoughtful reply')}>Reply</button>
    <button onClick={() => social.report(post.id,'post','Spam','reason')}>Report</button>
  </div>;
}
const setup = () => render(<SocialProvider currentUser={users[0]} users={users} posts={[post]}><SocialProbe/></SocialProvider>);
beforeEach(() => window.localStorage.clear());
test('social actions persist and can reverse in demo browser', () => {
  setup();
  fireEvent.click(screen.getByText('Like'));
  expect(screen.getByTestId('liked').textContent).toBe('yes');
  fireEvent.click(screen.getByText('Like'));
  expect(screen.getByTestId('liked').textContent).toBe('no');
  fireEvent.click(screen.getByText('Follow'));
  expect(screen.getByTestId('following').textContent).toBe('yes');
  fireEvent.click(screen.getByText('Reply'));
  expect(screen.getByTestId('replies').textContent).toBe('1');
  expect(screen.getByTestId('notifications').textContent).toBe('3'); // initial like + follow + reply
  fireEvent.click(screen.getByText('Report'));
  const saved = JSON.parse(localStorage.getItem(SOCIAL_STORAGE_KEY));
  expect(saved.reports).toHaveLength(1);
  expect(saved.replies[post.id][0].text).toBe('a thoughtful reply');
});
test('normalization handles older or corrupt browser data', () => {
  const social = normalizeSocial({likes:{'a':[1]}, messages:'broken', replies:null, reports:[]});
  expect(social.messages).toEqual([]);
  expect(social.replies).toEqual({});
  expect(social.likes.a).toEqual([1]);
});
test('thread actions expose accessible links without wrapping another router', () => {
  render(<SocialProvider currentUser={users[0]} users={users} posts={[post]}><SocialPostActions post={post}/></SocialProvider>);
  expect(screen.getByRole('link', {name:'Open chirp thread'}).getAttribute('href')).toBe('/chirp/t-01');
  fireEvent.click(screen.getByRole('button', {name:'Like chirp'}));
  expect(screen.getByRole('button', {name:'Unlike chirp'}).getAttribute('aria-pressed')).toBe('true');
});
test('private groups start with controlled membership and rules', () => {
  const group = makeGroup('My group','Demo',1,{private:true,rules:'Be thoughtful.'});
  expect(group.private).toBe(true);
  expect(group.memberUids).toEqual([1]);
  expect(group.pendingMemberUids).toEqual([]);
  expect(group.rules).toBe('Be thoughtful.');
});
