/**
 * The entrance is route-agnostic: every time Account mounts for a new location
 * (including Back/Forward or direct URLs) a fresh keyed scene runs. No
 * interception of links, extra dependency, or old page DOM clone is needed.
 */
export default function ProfileReveal({ name }) {
  const lite = window.matchMedia?.('(max-width: 700px), (pointer: coarse), (prefers-reduced-motion: reduce)').matches;
  return (
    <div className={`profile-reveal${lite ? ' profile-reveal--lite' : ''}`} aria-hidden="true">
      <div className="profile-reveal__curtain profile-reveal__curtain--left" />
      <div className="profile-reveal__curtain profile-reveal__curtain--right" />
      <div className="profile-reveal__flare" />
      <div className="profile-reveal__core"><span>✳</span><small>ENTERING @{name}</small></div>
      {!lite && <div className="profile-reveal__fragments">
        {Array.from({ length: 22 }, (_, i) => (
          <i key={i} style={{ '--i': i, '--x': `${(i * 43 + 9) % 96}%`, '--y': `${(i * 37 + 15) % 88}%`, '--dx': `${(i % 2 ? 1 : -1) * (32 + (i * 17) % 140)}px`, '--dy': `${((i * 29) % 130) - 65}px`, '--rot': `${(i * 47) % 210 - 105}deg` }} />
        ))}
      </div>}
    </div>
  );
}
