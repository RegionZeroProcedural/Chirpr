import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useUsernameAvailability, isUsernameTaken } from '../components/useUsernameAvailability';
import { usePostDestruction } from '../components/usePostDestruction';

const users = [
  { uid: 1, username: 'keegan' },
  { uid: 2, username: 'james' },
];

function UsernameTest() {
  const [name, setName] = useState('');
  const availability = useUsernameAvailability(name, users);
  return <><input aria-label="username" value={name} onChange={event => setName(event.target.value)} /><span role="status">{availability.message}</span></>;
}

test('250ms idle debounce restarts whenever typing resumes', () => {
  jest.useFakeTimers();
  render(<UsernameTest />);
  fireEvent.change(screen.getByRole('textbox', { name: 'username' }), { target: { value: 'jam' } });
  act(() => jest.advanceTimersByTime(200));
  expect(screen.getByRole('status').textContent).toMatch(/Checking/);
  fireEvent.change(screen.getByRole('textbox', { name: 'username' }), { target: { value: 'james' } });
  act(() => jest.advanceTimersByTime(249));
  expect(screen.getByRole('status').textContent).toMatch(/Checking/);
  act(() => jest.advanceTimersByTime(1));
  expect(screen.getByRole('status').textContent).toMatch(/already in use/);
  fireEvent.change(screen.getByRole('textbox', { name: 'username' }), { target: { value: 'chirpr_fan' } });
  act(() => jest.advanceTimersByTime(250));
  expect(screen.getByRole('status').textContent).toMatch(/Available/);
  jest.useRealTimers();
});

test('username matching ignores case and excludes own uid', () => {
  expect(isUsernameTaken('JAMES', users)).toBe(true);
  expect(isUsernameTaken('james', users, 2)).toBe(false);
});


function DestructionTest({ onDelete }) {
  const { destroying, animateDelete } = usePostDestruction(onDelete, () => {});
  return <><button onClick={() => animateDelete('p-101')}>delete</button><div data-testid="post">{destroying['p-101'] || 'solid'}</div></>;
}

test('deletion shows destruction state before committing removal', () => {
  jest.useFakeTimers();
  const onDelete = jest.fn();
  render(<DestructionTest onDelete={onDelete} />);
  fireEvent.click(screen.getByRole('button', { name: 'delete' }));
  expect(screen.getByTestId('post').textContent).toBe('deleted');
  expect(onDelete).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1469));
  expect(onDelete).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onDelete).toHaveBeenCalledWith('p-101');
  expect(screen.getByTestId('post').textContent).toBe('solid');
  jest.useRealTimers();
});
