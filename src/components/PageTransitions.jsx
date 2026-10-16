import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const TransitionContext = createContext(null);
const VISITOR_ROUTES = new Set(['/', '/home', '/login', '/register', '/about']);
const EXIT_DURATION = 820;

/**
 * The split is a visual, inert snapshot of the page that is being left.
 * React Router navigates normally underneath it. This needs no animation
 * library or extra npm packages and doesn't clone live React component state.
 */
function makeSplitCurtain(page) {
    const curtain = document.createElement('div');
    curtain.className = 'chirpr-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.inert = true;

    const scrollOffset = window.scrollY || document.documentElement.scrollTop || 0;
    ['left', 'right'].forEach(side => {
        const half = document.createElement('div');
        half.className = `chirpr-curtain__half chirpr-curtain__half--${side}`;
        const snapshot = page.cloneNode(true);
        snapshot.classList.add('chirpr-curtain__snapshot');
        snapshot.style.marginTop = `${-scrollOffset}px`;
        half.appendChild(snapshot);
        curtain.appendChild(half);
    });
    document.body.appendChild(curtain);
    return curtain;
}

export function PageTransitionProvider({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const curtainRef = useRef(null);
    const lockedRef = useRef(false);
    const timerRef = useRef(null);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        curtainRef.current?.remove();
    }, []);

    const moveTo = useCallback((to) => {
        const destination = typeof to === 'string' ? to : to.pathname;
        if (!destination || destination === location.pathname) return;
        if (lockedRef.current) return;

        if (!VISITOR_ROUTES.has(location.pathname) || !VISITOR_ROUTES.has(destination)
            || window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 700px), (pointer: coarse)').matches) {
            navigate(to);
            return;
        }

        const currentPage = document.querySelector('[data-transition-page]');
        if (!currentPage) {
            navigate(to);
            return;
        }

        lockedRef.current = true;
        const curtain = makeSplitCurtain(currentPage);
        curtainRef.current = curtain;

        // New scene is mounted behind the outgoing page's two halves.
        navigate(to);
        window.scrollTo({ top: 0, behavior: 'instant' });
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (curtain.isConnected) curtain.classList.add('chirpr-curtain--open');
        }));

        timerRef.current = window.setTimeout(() => {
            curtain.remove();
            if (curtainRef.current === curtain) curtainRef.current = null;
            lockedRef.current = false;
        }, EXIT_DURATION);
    }, [location.pathname, navigate]);

    return (
        <TransitionContext.Provider value={moveTo}>
            {children}
        </TransitionContext.Provider>
    );
}

/** Link with the same semantics as React Router Link (new tab, modifiers, etc.). */
export function TransitionLink({ to, onClick, target, ...props }) {
    const transitionTo = useContext(TransitionContext);

    function handleClick(event) {
        if (onClick) onClick(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
            || event.shiftKey || event.altKey || (target && target !== '_self')
            || !transitionTo) return;
        event.preventDefault();
        transitionTo(to);
    }

    return <Link {...props} to={to} target={target} onClick={handleClick} />;
}
