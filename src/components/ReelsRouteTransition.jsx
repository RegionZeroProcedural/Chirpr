import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Keep the old route mounted briefly so the first phase of the portal
// transition actually shows the page the user is leaving. Then switch the
// React Router scene behind an opaque veil — no DOM cloning or extra packages.
const SCENE_SWAP_MS = 315;
const PORTAL_DURATION_MS = 1320;

export function shouldEnterReels(fromPath, toPath, signedIn) {
  return !!signedIn && fromPath !== '/reels' && toPath === '/reels';
}

function createPortalShards() {
  // A fresh layout for EACH entry, but one stable layout for the entire cycle.
  // These values only affect decorative transforms (never DOM layout).
  return Array.from({ length: 16 }, (_, index) => {
    const phase = (index % 4);
    const spread = 47 + Math.random() * 28;
    const vertical = 32 + Math.random() * 34;
    const startX = phase === 0 ? -spread : phase === 1 ? spread : (Math.random() - .5) * 95;
    const startY = phase === 2 ? -vertical : phase === 3 ? vertical : (Math.random() - .5) * 70;
    const dockX = Math.round((Math.random() - .5) * 195);
    const dockY = Math.round((Math.random() - .5) * 340);
    const rotation = Math.round((Math.random() - .5) * 230);
    return {
      id: index,
      style: {
        '--shard-from-x': `${startX.toFixed(1)}vw`,
        '--shard-from-y': `${startY.toFixed(1)}vh`,
        '--shard-dock-x': `${dockX}px`,
        '--shard-dock-y': `${dockY}px`,
        '--shard-away-x': `${Math.round(dockX * 3.8)}px`,
        '--shard-away-y': `${Math.round(dockY * 3.8)}px`,
        '--shard-rotation': `${rotation}deg`,
        '--shard-delay': `${Math.round(Math.random() * 95)}ms`,
        '--shard-hue': index % 3 === 0 ? '319' : index % 3 === 1 ? '188' : '259',
      },
    };
  });
}

function ReelsPortal({ shards, lite = false }) {
  return (
    <div className={`reels-route-portal${lite ? ' reels-route-portal--lite' : ''}`} aria-hidden="true">
      <div className="reels-route-portal__veil" />
      <div className="reels-route-portal__horizon" />
      <div className="reels-route-portal__orbit reels-route-portal__orbit--wide" />
      <div className="reels-route-portal__orbit reels-route-portal__orbit--small" />
      <div className="reels-route-portal__gate">
        <span className="reels-route-portal__gate-glint" />
        <span className="reels-route-portal__gate-strip" />
        <span className="reels-route-portal__gate-play">▶</span>
      </div>
      <div className="reels-route-portal__fragments">
        {shards.map(({ id, style }) => <i key={id} style={style} />)}
      </div>
      <div className="reels-route-portal__title">
        <span>CHIRPR</span><strong>REELS</strong><small>ONE SCROLL · EVERY WORLD</small>
      </div>
    </div>
  );
}

/**
 * Wraps the application's Routes rather than individual buttons.
 * This catches ALL route changes into /reels: Links, programmatic navigate(),
 * Back/Forward history, and clicks from any page.
 *
 * If a demo user is signed out, existing /reels -> /login protection applies;
 * the Reels entrance isn't played for a page they cannot access.
 */
export default function ReelsRouteTransition({ signedIn, children }) {
  const location = useLocation();
  const [renderedLocation, setRenderedLocation] = useState(location);
  const displayedRef = useRef(location);
  const [portal, setPortal] = useState(null);
  const swapTimerRef = useRef(null);
  const finishTimerRef = useRef(null);

  useLayoutEffect(() => {
    window.clearTimeout(swapTimerRef.current);
    window.clearTimeout(finishTimerRef.current);

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const shouldAnimate = !reduceMotion && shouldEnterReels(
      displayedRef.current.pathname, location.pathname, signedIn
    );

    if (!shouldAnimate) {
      displayedRef.current = location;
      setRenderedLocation(location);
      setPortal(null);
      return;
    }

    const mobile = window.matchMedia?.('(max-width: 700px), (pointer: coarse)').matches;
    setPortal({ id: location.key, lite: mobile, shards: mobile ? [] : createPortalShards() });

    // Mount Reels only once the portal has hidden the previous scene.
    swapTimerRef.current = window.setTimeout(() => {
      displayedRef.current = location;
      setRenderedLocation(location);
      window.scrollTo(0, 0);
    }, mobile ? 158 : SCENE_SWAP_MS);

    finishTimerRef.current = window.setTimeout(() => {
      setPortal(null);
    }, mobile ? 430 : PORTAL_DURATION_MS);

    // Cleanup prevents stale route swaps if navigation changes mid-transition.
    return () => {
      window.clearTimeout(swapTimerRef.current);
      window.clearTimeout(finishTimerRef.current);
    };
  }, [location, signedIn]);

  return (
    <>
      {children(renderedLocation)}
      {portal && <ReelsPortal key={portal.id} shards={portal.shards} lite={portal.lite} />}
    </>
  );
}
