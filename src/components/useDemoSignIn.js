import { useCallback, useEffect, useRef, useState } from 'react';

const DISSOLVE_MS = 860;

/** Frontend-only sign-in choreography. Native required fields validate the inputs. */
export default function useDemoSignIn(onSignIn) {
    const [dissolving, setDissolving] = useState(false);
    const timerRef = useRef(null);
    const activeRef = useRef(false);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const handleSubmit = useCallback((event) => {
        event.preventDefault();
        if (activeRef.current) return;
        const form = event.currentTarget;
        if (!form.reportValidity()) return;

        // Deliberately accepts any nonempty credentials. No user identity is verified.
        activeRef.current = true;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
            onSignIn();
        } else {
            setDissolving(true);
            timerRef.current = window.setTimeout(onSignIn, DISSOLVE_MS);
        }
    }, [onSignIn]);

    return { dissolving, handleSubmit };
}
