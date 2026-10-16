import { useCallback, useEffect, useRef, useState } from 'react';

const DISSOLVE_MS = 860;

/** Shares the login dissolve between password-demo and password-free guest entry. */
export default function useDemoSignIn(onSignIn, onGuestSignIn = onSignIn) {
    const [dissolving, setDissolving] = useState(false);
    const timerRef = useRef(null);
    const activeRef = useRef(false);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const beginTransition = useCallback((action) => {
        if (activeRef.current || typeof action !== 'function') return;
        activeRef.current = true;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        if (reduceMotion) {
            action();
        } else {
            setDissolving(true);
            timerRef.current = window.setTimeout(action, DISSOLVE_MS);
        }
    }, []);

    const handleSubmit = useCallback((event) => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        beginTransition(onSignIn);
    }, [beginTransition, onSignIn]);

    // Does not validate or submit surrounding login/registration fields.
    const handleGuestSignIn = useCallback(() => beginTransition(onGuestSignIn), [beginTransition, onGuestSignIn]);

    return { dissolving, handleSubmit, handleGuestSignIn };
}
