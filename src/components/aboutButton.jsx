import { TransitionLink } from './PageTransitions.jsx';

export default function AboutButton() {
    return <TransitionLink to="/about" className="aboutButton">About</TransitionLink>;
}
