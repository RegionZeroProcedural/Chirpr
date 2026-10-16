/** A temporary frontend identity, not an authenticated account. */
export const GUEST_MODE_KEY = 'chirpr-demo-guest';
export const GUEST_UID = 'chirpr-guest-preview';
export const GUEST_USER = Object.freeze({
  uid: GUEST_UID,
  username: 'chirpr_guest',
  displayName: 'Guest Explorer',
  bio: 'Just exploring Chirpr ✦',
  joined: 'Guest preview',
  chirps: [],
  isGuest: true
});

export function isGuestMode(storage) {
  try { return storage?.getItem(GUEST_MODE_KEY) === '1'; }
  catch { return false; }
}
