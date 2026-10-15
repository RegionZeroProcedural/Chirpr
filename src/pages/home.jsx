import useDemoSignIn from '../components/useDemoSignIn.js';
import AuthDissolveParticles from '../components/AuthDissolveParticles.jsx';
import { TransitionLink } from '../components/PageTransitions.jsx';

import Background from '../components/background.jsx';
import Hero from '../components/hero.jsx';
import LoginBox from '../components/loginBox.jsx';
import LoginButton from '../components/loginButton.jsx';
import RegisterButton from '../components/registerButton.jsx';
import AboutButton from '../components/aboutButton.jsx';

export default function Home({ onDemoSignIn }) {
    const { dissolving, handleSubmit } = useDemoSignIn(onDemoSignIn);
    return (
        <main className={`landing-page ${dissolving ? 'chirpr-auth-dissolving' : ''}`} data-transition-page>
            <AuthDissolveParticles active={dissolving} />
            <div className="landing-shape-scene" aria-hidden="true">
                <span className="home-shape home-shape--orb" />
                <span className="home-shape home-shape--cube" />
                <span className="home-shape home-shape--diamond" />
                <span className="home-shape home-shape--ring" />
                <span className="home-shape home-shape--prism" />
                <span className="home-shape home-shape--mini" />
            </div>
            <Background />

            <div className="landing-shell">
                <header className="landing-nav">
                    <TransitionLink className="landing-brand" to="/" aria-label="Chirpr home">
                        <span className="landing-brand__mark" aria-hidden="true" />
                        <span>chirpr<span className="landing-brand__dot">.</span></span>
                    </TransitionLink>

                    <nav className="landing-nav__links" aria-label="Main navigation">
                        <AboutButton />
                        <TransitionLink to="/login" className="landing-nav__login">Log in</TransitionLink>
                        <TransitionLink to="/register" className="landing-nav__join chirpr-hover-glow">Get started <span aria-hidden="true">↗</span></TransitionLink>
                    </nav>
                </header>

                <section className="landing-hero" aria-label="Welcome to Chirpr">
                    <div className="landing-hero__content">
                        <div className="landing-eyebrow">
                            <span className="landing-eyebrow__dot" aria-hidden="true" />
                            YOUR CORNER OF THE INTERNET
                        </div>

                        <Hero />

                        <div className="landing-hero__actions">
                            <TransitionLink className="landing-cta landing-cta--primary chirpr-hover-glow" to="/register">
                                Create your account <span aria-hidden="true">→</span>
                            </TransitionLink>
                            <TransitionLink className="landing-cta landing-cta--secondary chirpr-hover-glow" to="/login">
                                I already have an account
                            </TransitionLink>
                        </div>

                        <p className="landing-hero__microcopy">
                            <span aria-hidden="true">✦</span> Small thoughts. Big connections.
                        </p>
                    </div>

                    <aside className="landing-auth-wrap" aria-label="Sign in to Chirpr">
                        <div className="landing-auth">
                            <div className="landing-auth__head">
                                <span className="landing-auth__symbol" aria-hidden="true">✳</span>
                                <span className="landing-auth__tag">WELCOME BACK</span>
                            </div>
                            <h2>Good to see you<span>.</span></h2>
                            <p className="landing-auth__description">Your conversations are waiting.</p>

                            <form onSubmit={handleSubmit} aria-busy={dissolving}>
                                <LoginBox idPrefix="landing-login" required />
                                <div className="landing-auth__actions">
                                    <LoginButton submit disabled={dissolving} />
                                </div>
                                <p className="landing-auth__demo-note">Demo mode · Any credentials work</p>
                            </form>
                            <div className="landing-auth__divider"><span>NEW AROUND HERE?</span></div>
                            <div className="landing-auth__register">
                                <RegisterButton />
                            </div>
                        </div>

                        <div className="landing-floating-note" aria-hidden="true">
                            <span className="landing-floating-note__icon">✦</span>
                            <span>Something worth sharing starts here.</span>
                        </div>
                    </aside>
                </section>

                <section className="landing-features" aria-label="Chirpr highlights">
                    <div className="landing-feature">
                        <span className="landing-feature__icon" aria-hidden="true">✎</span>
                        <div><h3>Share your thoughts</h3><p>Little moments deserve a voice.</p></div>
                    </div>
                    <div className="landing-feature">
                        <span className="landing-feature__icon" aria-hidden="true">◎</span>
                        <div><h3>Find your people</h3><p>Connect around what matters.</p></div>
                    </div>
                    <div className="landing-feature">
                        <span className="landing-feature__icon" aria-hidden="true">✧</span>
                        <div><h3>Make it yours</h3><p>Your profile. Your space.</p></div>
                    </div>
                </section>

                <footer className="landing-footer">
                    <span>© {new Date().getFullYear()} Chirpr</span>
                    <span>Made for the conversations that matter.</span>
                </footer>
            </div>
        </main>
    );
}
