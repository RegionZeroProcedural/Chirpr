import { useState } from 'react';
import useDemoSignIn from '../components/useDemoSignIn.js';
import AuthDissolveParticles from '../components/AuthDissolveParticles.jsx';
import { TransitionLink } from '../components/PageTransitions.jsx';
import LoginBox from '../components/loginBox.jsx';

export default function Login({ onDemoSignIn }) {
    const [feedback, setFeedback] = useState('');

    const { dissolving, handleSubmit } = useDemoSignIn(onDemoSignIn);

    return (
        <main className={`login-page ${dissolving ? 'chirpr-auth-dissolving' : ''}`} data-transition-page>
            <AuthDissolveParticles active={dissolving} />
            <div className="login-page__atmosphere" aria-hidden="true" />
            <div className="login-page__scene" aria-hidden="true">
                <div className="login-page__orbit login-page__orbit--one" />
                <div className="login-page__orbit login-page__orbit--two" />
                <div className="login-orb login-orb--distant" />
                <div className="login-orb login-orb--large" />
                <div className="login-orb login-orb--top" />
                <div className="login-orb login-orb--middle" />
                <div className="login-orb login-orb--small" />
                <div className="login-orb login-orb--soft" />
                <span className="login-page__sparkle login-page__sparkle--one" />
                <span className="login-page__sparkle login-page__sparkle--two" />
                <span className="login-page__sparkle login-page__sparkle--three" />
            </div>

            <header className="login-page__nav">
                <TransitionLink className="landing-brand" to="/" aria-label="Chirpr home">
                    <span className="landing-brand__mark" aria-hidden="true" />
                    <span>chirpr<span className="landing-brand__dot">.</span></span>
                </TransitionLink>
                <nav className="login-page__nav-links" aria-label="Login navigation">
                    <TransitionLink to="/" className="login-page__back">← Back to home</TransitionLink>
                    <TransitionLink to="/register" className="login-page__nav-signup chirpr-hover-glow">Get started <span aria-hidden="true">↗</span></TransitionLink>
                </nav>
            </header>

            <div className="login-page__main">
                <div className="login-page__copy">
                    <span className="login-page__eyebrow"><span className="login-page__eyebrow-dot" /> A SPACE TO BE YOURSELF</span>
                    <h1>Your corner of<br />the internet <span>awaits.</span></h1>
                    <p>Jump back into the conversations, people, and little moments that make Chirpr yours.</p>
                    <div className="login-page__footnote"><span aria-hidden="true">✦</span> Small thoughts. Big connections.</div>
                </div>

                <section className="login-page__card" aria-labelledby="login-title">
                    <div className="login-page__card-top">
                        <span className="login-page__card-symbol" aria-hidden="true">✳</span>
                        <span className="login-page__card-kicker">GOOD TO SEE YOU AGAIN</span>
                    </div>
                    <h2 id="login-title">Welcome back<span>.</span></h2>
                    <p className="login-page__card-intro">Enter any username and password to preview your feed.</p>

                    <form className="login-page__form" onSubmit={handleSubmit} aria-busy={dissolving}>
                        <LoginBox idPrefix="login-page" required showPasswordToggle />
                        <div className="login-page__form-options">
                            <label className="login-page__remember">
                                <input type="checkbox" name="remember" />
                                Remember me
                            </label>
                            <button
                                type="button"
                                className="login-page__forgot"
                                onClick={() => setFeedback('Password recovery will be available when authentication is connected.')}
                            >
                                Forgot password?
                            </button>
                        </div>
                        <button className="login-page__submit chirpr-hover-glow" type="submit" disabled={dissolving}>
                            {dissolving ? "Opening your feed…" : "Sign in"} <span aria-hidden="true">→</span>
                        </button>
                        {feedback && <p className="login-page__feedback" role="status">{feedback}</p>}
                    </form>

                    <div className="login-page__divider"><span>NEW TO CHIRPR?</span></div>
                    <TransitionLink className="login-page__create chirpr-hover-glow" to="/register">
                        Create an account <span aria-hidden="true">↗</span>
                    </TransitionLink>
                    <p className="login-page__card-bottom">Your voice belongs here.</p>
                </section>
            </div>

            <footer className="login-page__footer">
                <span>© {new Date().getFullYear()} Chirpr</span>
                <span>Every thought deserves to take flight.</span>
            </footer>
        </main>
    );
}
