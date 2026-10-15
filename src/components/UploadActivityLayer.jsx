import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { dismissMediaUpload, getMediaUploads, subscribeMediaUploads } from '../data/mediaUploadQueue.js';

const flightMs = 1000;
function UploadFlight({ upload, pathname }) {
  const [phase, setPhase] = useState('outbound');
  const [target, setTarget] = useState(null);
  const handled = useRef(false);
  const highlight = useRef({ element: null, timer: null });
  useEffect(() => () => {
    clearTimeout(highlight.current.timer);
    highlight.current.element?.classList.remove('chirpr-upload-post-landed');
  }, []);
  const isDone = upload.status === 'complete' || upload.status === 'error';
  useEffect(() => {
    const timeout = setTimeout(() => setPhase('waiting'), flightMs);
    return () => clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (phase !== 'waiting' || !isDone || handled.current) return;
    handled.current = true;
    if (upload.status !== 'complete' || !upload.isProfile || !upload.postId) {
      setPhase('finished');
      return;
    }
    // Only land in an actual, visible own-profile post. Navigating away never
    // changes the background upload; it simply skips the landing flourish.
    const ownPath = pathname === '/account' || pathname.toLowerCase() === `/users/${upload.profileUsername.toLowerCase()}`;
    const post = ownPath ? [...document.querySelectorAll('[data-new-chirp]')]
      .find(node => node.getAttribute('data-new-chirp') === upload.postId) : null;
    const rect = post?.getBoundingClientRect();
    if (!rect || rect.width < 30 || rect.bottom < 0 || rect.top > window.innerHeight) {
      setPhase('finished'); return;
    }
    setTarget({ x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + Math.min(rect.height, 180) / 2 });
    setPhase('returning');
    post.classList.add('chirpr-upload-post-landed');
    highlight.current.element = post;
    highlight.current.timer = setTimeout(() => {
      post.isConnected && post.classList.remove('chirpr-upload-post-landed');
      highlight.current.element = null;
    }, 1350);
  }, [phase, isDone, upload.status, upload.isProfile, upload.postId, upload.profileUsername, pathname]);
  useEffect(() => {
    if (phase !== 'returning') return;
    const timer = setTimeout(() => setPhase('finished'), 1250);
    return () => clearTimeout(timer);
  }, [phase]);
  if (phase === 'finished' || phase === 'waiting') return null;
  return <div className={`chirpr-flight-note chirpr-flight-note--${phase}`} style={target ? { '--landing-x': `${target.x}px`, '--landing-y': `${target.y}px` } : undefined} aria-hidden="true">
    <svg viewBox="0 0 100 100" width="72" height="72" fill="none" aria-hidden="true"><path d="M5 48 92 7 61 94 45 59 5 48Z" fill="url(#flight-shine)" stroke="#d4faff" strokeWidth="2" strokeLinejoin="round"/><path d="M45 59 92 7 34 68" stroke="#f2d6ff" strokeWidth="2"/><defs><linearGradient id="flight-shine" x1="0" x2="100" y1="0" y2="100" gradientUnits="userSpaceOnUse"><stop stopColor="#69edff"/><stop offset=".52" stopColor="#9079f7"/><stop offset="1" stopColor="#ff66cf"/></linearGradient></defs></svg>
    <i /><i /><i />
  </div>;
}

/** The activity UI stays mounted across all routes, above the normal page but
 * never intercepting scrolling, taps, links, or typing. */
export default function UploadActivityLayer() {
  const uploads = useSyncExternalStore(subscribeMediaUploads, getMediaUploads);
  const { pathname } = useLocation();
  if (!uploads.length) return null;
  return createPortal(<div className="chirpr-upload-activity" aria-label="Media upload activity">
    {uploads.map(upload => <UploadFlight key={upload.id} upload={upload} pathname={pathname} />)}
    <aside className="chirpr-upload-notices" aria-live="polite" aria-relevant="additions text">
      {uploads.slice(-3).map(upload => (
        <div key={upload.id} className={`chirpr-upload-notice chirpr-upload-notice--${upload.status}`}>
          <span className="chirpr-upload-notice__icon" aria-hidden="true">{upload.status === 'complete' ? '✓' : upload.status === 'error' ? '!' : '✳'}</span>
          <div><strong>{upload.status === 'complete' ? 'Chirp delivered' : upload.status === 'error' ? 'Upload unsuccessful' : 'Your chirp is on its way'}</strong>
            <small>{upload.message}</small>
            {upload.status === 'complete' && upload.isProfile && upload.profileUsername && <Link to={`/users/${upload.profileUsername}#chirp-${upload.postId}`}>View post ↗</Link>}
          </div>
          <button type="button" aria-label="Dismiss upload notification" onClick={() => dismissMediaUpload(upload.id)}>×</button>
        </div>
      ))}
    </aside>
  </div>, document.body);
}
