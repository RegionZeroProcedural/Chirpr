import { TransitionLink } from './PageTransitions.jsx';

export default function RegisterButton() {
    return (
        <TransitionLink to="/register" className="registerButton chirpr-hover-glow">
            Create an account
        </TransitionLink>
    );
}
