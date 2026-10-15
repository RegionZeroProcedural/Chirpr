import { useEffect, useState } from 'react';

// This checks Chirpr's current frontend-only user records. The real API must
// perform an atomic uniqueness check when registration/profile changes are saved.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function isUsernameTaken(username, users = [], ownUid = null) {
  const wanted = username.trim().toLowerCase();
  return users.some(user => String(user.uid) !== String(ownUid) && user.username?.toLowerCase() === wanted);
}

export function useUsernameAvailability(username, users = [], ownUid = null) {
  const [result, setResult] = useState({ value: '', status: 'idle' });
  const value = username.trim();
  const isValid = USERNAME_PATTERN.test(value);
  const isOwn = ownUid != null && users.some(user => String(user.uid) === String(ownUid) && user.username?.toLowerCase() === value.toLowerCase());

  useEffect(() => {
    if (!isValid || isOwn) return undefined;
    // Every keystroke cancels the preceding timer. Only a 250ms idle interval
    // performs the check, rather than sending one check per character.
    const timer = window.setTimeout(() => {
      setResult({ value, status: isUsernameTaken(value, users, ownUid) ? 'taken' : 'available' });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value, isValid, isOwn, users, ownUid]);

  if (!value) return { status: 'idle', message: '3–20 letters, numbers, or underscores.' };
  if (!isValid) return { status: 'invalid', message: 'Use 3–20 letters, numbers, or underscores.' };
  if (isOwn) return { status: 'own', message: '✓ This is your current username.' };
  if (result.value.toLowerCase() !== value.toLowerCase()) return { status: 'waiting', message: 'Checking after you stop typing…' };
  return result.status === 'taken'
    ? { status: 'taken', message: '✕ That username is already in use.' }
    : { status: 'available', message: '✓ Available in this demo.' };
}
