import { useState } from 'react';
import { TransitionLink } from '../components/PageTransitions.jsx';
import useDemoSignIn from '../components/useDemoSignIn.js';
import AuthDissolveParticles from '../components/AuthDissolveParticles.jsx';
import GuestSignInButton from '../components/GuestSignInButton.jsx';
import { USERNAME_PATTERN, isUsernameTaken, useUsernameAvailability } from '../components/useUsernameAvailability.js';

const Cube = ({ name }) => <span className={`register-cube register-cube--${name}`} />;

export default function Register({ users = [], onRegister, onGuestSignIn }) {
    const { dissolving, handleGuestSignIn } = useDemoSignIn(null, onGuestSignIn);
    const [username, setUsername] = useState('');
    const usernameStatus = useUsernameAvailability(username, users);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [feedback, setFeedback] = useState('');

    function handleSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (!USERNAME_PATTERN.test(username.trim())) { setFeedback('Choose a username using 3–20 letters, numbers, or underscores.'); return; }
        if (isUsernameTaken(username, users)) { setFeedback('That username is already in use.'); return; }
        const password = form.elements.password.value;
        const confirmation = form.elements.confirmPassword.value;
        if (password !== confirmation) {
            setFeedback('Your passwords do not match yet.');
            return;
        }
        const created = onRegister?.({ username: username.trim(), email: form.elements.email.value });
        if (!created) setFeedback('Unable to create demo account in this browser. Please try another username.');
    }

    return (
        <main className={`login-page register-page ${dissolving ? 'chirpr-auth-dissolving' : ''}`} data-transition-page>
            <AuthDissolveParticles active={dissolving} />
            <div className="login-page__atmosphere" aria-hidden="true" />
            <div className="register-page__scene" aria-hidden="true">
                <span className="register-page__orbit register-page__orbit--one" />
                <span className="register-page__orbit register-page__orbit--two" />
                <Cube name="large" />
                <Cube name="top" />
                <Cube name="middle" />
                <Cube name="small" />
                <Cube name="distant" />
                <Cube name="bottom" />
                <span className="register-page__star register-page__star--one" />
                <span className="register-page__star register-page__star--two" />
            </div>

            <header className="login-page__nav">
                <TransitionLink className="landing-brand" to="/" aria-label="Chirpr home">
                    <span className="landing-brand__mark" aria-hidden="true" />
                    <span>chirpr<span className="landing-brand__dot">.</span></span>
                </TransitionLink>
                <nav className="login-page__nav-links" aria-label="Registration navigation">
                    <TransitionLink to="/" className="login-page__back">← Back to home</TransitionLink>
                    <TransitionLink to="/login" className="login-page__nav-signup chirpr-hover-glow">Sign in <span aria-hidden="true">→</span></TransitionLink>
                </nav>
            </header>

            <div className="login-page__main register-page__main">
                <div className="login-page__copy register-page__copy">
                    <span className="login-page__eyebrow"><span className="login-page__eyebrow-dot" /> A PLACE TO FIND YOUR PEOPLE</span>
                    <h1>Good things<br />start with <span>hello.</span></h1>
                    <p>Create your own corner of the internet. Every connection starts somewhere, and yours starts here.</p>
                    <div className="login-page__footnote"><span aria-hidden="true">✦</span> Your voice. Your people. Your Chirpr.</div>
                </div>

                <section className="login-page__card register-page__card" aria-labelledby="register-title">
                    <div className="login-page__card-top">
                        <span className="login-page__card-symbol" aria-hidden="true">◇</span>
                        <span className="login-page__card-kicker">A FRESH START</span>
                    </div>
                    <h2 id="register-title">Join Chirpr<span>.</span></h2>
                    <p className="login-page__card-intro">A little space to be authentically you.</p>
                    <form className="login-page__form register-page__form" onSubmit={handleSubmit}>
                        <div className="register-page__row">
                            <label htmlFor="register-username">Username</label>
                            <div className="chirpr-username-input" data-availability={usernameStatus.status}>
                            <input id="register-username" type="text" name="username" autoComplete="username" placeholder="choose_a_username" value={username} onChange={event => { setUsername(event.target.value); setFeedback(''); }} minLength={3} maxLength={20} required aria-describedby="register-username-status" />
                            </div><span id="register-username-status" className={`chirpr-username-status chirpr-username-status--${usernameStatus.status}`} role="status" aria-live="polite">{usernameStatus.message}</span>
                        </div>
                        <div className="register-page__row">
                            <label htmlFor="register-email">Email</label>
                            <input id="register-email" type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
                        </div>
                        <div className="register-page__row">
                            <label htmlFor="register-password">Password</label>
                            <div className="register-page__password-field">
                                <input id="register-password" type={passwordVisible ? 'text' : 'password'} name="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required />
                                <button className="login-password-toggle" type="button" aria-pressed={passwordVisible} aria-label={passwordVisible ? 'Hide password' : 'Show password'} onClick={() => setPasswordVisible(v => !v)}>{passwordVisible ? 'Hide' : 'Show'}</button>
                            </div>
                        </div>
                        <div className="register-page__row">
                            <label htmlFor="register-confirm">Confirm password</label>
                            <input id="register-confirm" type={passwordVisible ? 'text' : 'password'} name="confirmPassword" autoComplete="new-password" placeholder="One more time" minLength={8} required />
                        </div>
                        <label className="register-page__terms">
                            <input type="checkbox" required />
                            <span>I'm ready to join the conversation.</span>
                        </label>
                        <button type="submit" className="login-page__submit chirpr-hover-glow">Create my account <span aria-hidden="true">↗</span></button>
                        {feedback && <p className="login-page__feedback" role="status">{feedback}</p>}
                    </form>
                    <div className="chirpr-guest-entry">
                        <span className="chirpr-guest-entry__label">WANT TO LOOK AROUND FIRST?</span>
                        <GuestSignInButton onClick={handleGuestSignIn} disabled={dissolving} />
                        <small>Preview the site now. Create an account later.</small>
                    </div>
                    <div className="login-page__divider"><span>ALREADY HERE?</span></div>
                    <TransitionLink className="login-page__create chirpr-hover-glow" to="/login">Sign in instead <span aria-hidden="true">→</span></TransitionLink>
                    <p className="login-page__card-bottom">It all begins with a chirp.</p>
                </section>
            </div>

            <footer className="login-page__footer">
                <span>© {new Date().getFullYear()} Chirpr</span>
                <span>Every thought deserves to take flight.</span>
            </footer>
        </main>
    );
}
