import { createPortal } from 'react-dom';

/** Never blocks asynchronously; the parent performs sign-out after the exit. */
export default function SignOutTransition({ active }) {
  if (!active) return null;
  return createPortal(
    <div className="chirpr-signout" role="status" aria-live="polite" aria-label="Signing out of Chirpr">
      <div className="chirpr-signout__side chirpr-signout__side--left" />
      <div className="chirpr-signout__side chirpr-signout__side--right" />
      <div className="chirpr-signout__spark" aria-hidden="true">✳</div>
      <div className="chirpr-signout__message"><strong>Until the next thought<span>.</span></strong><small>SEE YOU SOON · CHIRPR</small></div>
    </div>, document.body
  );
}
