import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

export function destinationForPath(pathname) {
  if (/^\/reels(?:\/|$)/.test(pathname)) return 'reels';
  if (/^\/users\/|^\/account(?:\/|$)/.test(pathname)) return 'profile';
  if (/^\/groups(?:\/|$)/.test(pathname)) return 'groups';
  if (/^\/discover(?:\/|$)/.test(pathname)) return 'discover';
  if (/^\/messages(?:\/|$)/.test(pathname)) return 'messages';
  if (/^\/notifications(?:\/|$)/.test(pathname)) return 'activity';
  if (/^\/bookmarks(?:\/|$)/.test(pathname)) return 'saved';
  if (/^\/chirp(?:\/|$)/.test(pathname)) return 'thread';
  if (/^\/tags(?:\/|$)/.test(pathname)) return 'tag';
  if (/^\/(?:profileSettings|editProfileDetails|settings)(?:\/|$)/.test(pathname)) return 'settings';
  if (/^\/safety(?:\/|$)/.test(pathname)) return 'safety';
  if (/^\/feed(?:\/|$)/.test(pathname)) return 'feed';
  if (/^\/login(?:\/|$)/.test(pathname)) return 'login';
  if (/^\/register(?:\/|$)/.test(pathname)) return 'register';
  if (/^\/about(?:\/|$)/.test(pathname)) return 'about';
  return 'home';
}

const details = {
  feed: ['BACK IN THE CONVERSATION', '✳'], discover: ['FIND YOUR NEXT SPARK', '⌕'],
  groups: ['FIND YOUR PEOPLE', '✳'], messages: ['PICK UP THE CONVERSATION', '✉'],
  activity: ['A LITTLE SOMETHING NEW', '✦'], saved: ['THOUGHTS WORTH KEEPING', '✧'],
  thread: ['FOLLOW THE THREAD', '↶'], tag: ['FOLLOW THE IDEA', '#'],
  settings: ['MAKE IT YOURS', '⚙'], safety: ['YOUR SPACE, YOUR RULES', '◇'],
  profile: ['STEP INTO THEIR WORLD', '◉'], login: ['WELCOME BACK', '◌'],
  register: ['A NEW CHAPTER', '◇'], about: ['THE STORY BEHIND CHIRPR', '✦'],
  home: ['BACK TO THE BEGINNING', '✳']
};

/** Visual accent only — real routes mount immediately and remain interactive. */
export default function DestinationTransitions() {
  const location = useLocation();
  const previous = useRef(location.pathname);
  const timer = useRef(null);
  const [scene, setScene] = useState(null);
  useEffect(() => {
    const from = previous.current;
    previous.current = location.pathname;
    window.clearTimeout(timer.current);
    if (from === location.pathname || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setScene(null);
      return undefined;
    }
    const mobile = window.matchMedia?.('(max-width: 700px), (pointer: coarse)').matches;
    const type = destinationForPath(location.pathname);
    // The dedicated full-screen Reels portal owns this destination.
    if (type === 'reels') { setScene(null); return undefined; }
    setScene({ type, key: location.key, mobile });
    timer.current = window.setTimeout(() => setScene(null), mobile ? 310 : 720);
    return () => window.clearTimeout(timer.current);
  }, [location.key, location.pathname]);
  if (!scene) return null;
  const [label, symbol] = details[scene.type];
  return createPortal(
    <div key={scene.key} className={`chirpr-destination chirpr-destination--${scene.type}${scene.mobile ? ' chirpr-destination--lite' : ''}`} aria-hidden="true">
      <div className="chirpr-destination__glimmer" />
      {!scene.mobile && <div className="chirpr-destination__shapes">
        {Array.from({ length: 5 }, (_, i) => <i key={i} style={{ '--i': i, '--size': `${26 + 9 * i}px`, '--ring': `${85 + i * 62}px`, '--ring-half': `${-(85 + i * 62) / 2}px`, '--path-x': `${(i - 2) * 36}vw`, '--path-exit': `${(2 - i) * 14}vw`, '--origin-y': `${(i % 2 ? 1 : -1) * 22}vh` }} />)}
      </div>}
      <div className="chirpr-destination__identity"><b>{symbol}</b><small>{label}</small></div>
    </div>, document.body
  );
}
