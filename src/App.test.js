import { USERNAME_PATTERN } from './components/useUsernameAvailability.js';

test('username format matches the frontend profile form', () => {
  expect(USERNAME_PATTERN.test('chirpr_user')).toBe(true);
  expect(USERNAME_PATTERN.test('two words')).toBe(false);
});
