import { TransitionLink } from './PageTransitions.jsx';

export default function LoginButton({ submit = false, disabled = false }) {
    if (submit) {
        return (
            <button type="submit" disabled={disabled} className="loginButton chirpr-hover-glow">
                {disabled ? 'Opening feed…' : 'Log in'} <span aria-hidden="true">→</span>
            </button>
        );
    }
    return <TransitionLink to="/login" className="loginButton chirpr-hover-glow">Log in <span aria-hidden="true">→</span></TransitionLink>;
}
