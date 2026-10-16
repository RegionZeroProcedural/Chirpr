import React from 'react';
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => require('react').createElement('a', {href:to,...props}, children), useLocation: () => ({pathname:'/feed'}) }));
import { fireEvent, render, screen } from '@testing-library/react';
import { REACTIONS, SocialProvider, useSocial } from '../features/social/SocialStore.jsx';
import { ReactionControl } from '../features/social/SocialUI.jsx';
const users = [{ uid: 1, displayName: 'Keegan', username: 'keegan' }, { uid: 2, displayName: 'James', username: 'james' }, { uid: 3, displayName: 'Alex', username: 'alex' }];
const post = { id: 'new-reaction', uid: 2, text: 'The future is here!' };
function Probe() {
  const s = useSocial();
  return <div>
    <span data-testid="counts">{JSON.stringify(s.reactionSummary(post.id).counts)}</span>
    <span data-testid="messages">{JSON.stringify(s.state.messages)}</span>
    <ReactionControl post={post}/>
    <button onClick={() => s.reactToPost(post, 'wow')}>Wow</button>
    <button onClick={() => s.sendMessage(2, 'hello there')}>Message</button>
    <button onClick={() => s.reactToMessage(s.state.messages[0]?.id, 'love')}>React message</button>
    <button onClick={() => s.forwardMessage(s.state.messages[0]?.id, 3)}>Forward message</button>
    <button onClick={() => s.unsendMessage(s.state.messages[0]?.id)}>Unsend</button>
  </div>;
}
beforeEach(() => window.localStorage.clear());
test('reaction choices replace one another; counts do not duplicate a user', () => {
  render(<SocialProvider currentUser={users[0]} users={users} posts={[post]}><Probe /></SocialProvider>);
  fireEvent.click(screen.getByRole('button', {name:'Like chirp'}));
  expect(screen.getByTestId('counts').textContent).toContain('"like":1');
  fireEvent.click(screen.getByRole('button', {name:'Wow'}));
  expect(screen.getByTestId('counts').textContent).toContain('"wow":1');
  expect(screen.getByTestId('counts').textContent).not.toContain('"like":1');
  expect(screen.getByLabelText('1 reactions')).toBeTruthy();
});
test('DM reactions, forwarding and sender-only unsend keep tombstones', () => {
  render(<SocialProvider currentUser={users[0]} users={users} posts={[post]}><Probe /></SocialProvider>);
  fireEvent.click(screen.getByRole('button', {name:'Message'}));
  fireEvent.click(screen.getByRole('button', {name:'React message'}));
  expect(JSON.parse(screen.getByTestId('messages').textContent)[0].reactions['1']).toBe('love');
  fireEvent.click(screen.getByRole('button', {name:'Forward message'}));
  const messages = JSON.parse(screen.getByTestId('messages').textContent);
  expect(messages).toHaveLength(2);
  expect(messages[1].toUid).toBe(3);
  expect(messages[1].forwardedFrom).toBe(messages[0].id);
  fireEvent.click(screen.getByRole('button', {name:'Unsend'}));
  const after = JSON.parse(screen.getByTestId('messages').textContent);
  expect(after[0].unsent).toBe(true);
  expect(after[0].text).toBe('');
  expect(after[1].text).toBe('hello there'); // already forwarded as a separate demo record
});
test('picker contains all six reactions', () => {
  render(<SocialProvider currentUser={users[0]} users={users} posts={[post]}><Probe /></SocialProvider>);
  fireEvent.click(screen.getByRole('button', {name:'Choose a reaction'}));
  REACTIONS.forEach(reaction => expect(screen.getByTitle(reaction.label)).toBeTruthy());
});
