/** Uses a button, rather than a link, so guest entry does not submit a form. */
export default function GuestSignInButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      className="chirpr-guest-button chirpr-hover-glow"
      onClick={onClick}
      disabled={disabled}
      aria-label="Sign in as guest without an account"
    >
      <span className="chirpr-guest-button__icon" aria-hidden="true">✧</span>
      <span>Sign in as guest</span>
      <span className="chirpr-guest-button__arrow" aria-hidden="true">→</span>
    </button>
  );
}
