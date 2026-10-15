import { TransitionLink } from '../components/PageTransitions.jsx';

const values = [
    {
        number: '01', icon: '✎', title: 'Say what’s on your mind.',
        description: 'A quick thought, a long story, or a little piece of your day. There should be room for all of it.'
    },
    {
        number: '02', icon: '◎', title: 'Find your kind of people.',
        description: 'Follow the conversations you care about and discover people who see the world a little like you do.'
    },
    {
        number: '03', icon: '✧', title: 'Make the space yours.',
        description: 'Your profile, your voice, your way of showing up. Individuality is what makes a community interesting.'
    }
];

function ChirprBrand() {
    return (
        <TransitionLink className="landing-brand" to="/" aria-label="Chirpr home">
            <span className="landing-brand__mark" aria-hidden="true" />
            <span>chirpr<span className="landing-brand__dot">.</span></span>
        </TransitionLink>
    );
}

function AboutScene() {
    return (
        <div className="about-scene" aria-hidden="true">
            <span className="about-shape about-shape--sphere" />
            <span className="about-shape about-shape--cube" />
            <span className="about-shape about-shape--ring" />
            <span className="about-shape about-shape--diamond" />
            <span className="about-shape about-shape--tiny" />
            <span className="about-scene__star about-scene__star--a" />
            <span className="about-scene__star about-scene__star--b" />
            <span className="about-scene__star about-scene__star--c" />
        </div>
    );
}

function ConversationVisual() {
    return (
        <div className="about-visual" aria-label="Illustration of a conversation growing into connections" role="img">
            <div className="about-visual__halo about-visual__halo--outer" />
            <div className="about-visual__halo about-visual__halo--inner" />
            <div className="about-visual__core">
                <span className="about-visual__core-icon" aria-hidden="true">✳</span>
                <span>One thought.<br /><strong>Endless possibilities.</strong></span>
            </div>
            <div className="about-visual__message about-visual__message--top" aria-hidden="true">
                <span className="about-visual__avatar about-visual__avatar--violet">✦</span>
                <div><b>Someone shares</b><small>“I’ve been thinking…”</small></div>
                <span className="about-visual__signal">↗</span>
            </div>
            <div className="about-visual__message about-visual__message--bottom" aria-hidden="true">
                <span className="about-visual__avatar about-visual__avatar--cyan">◎</span>
                <div><b>A conversation starts</b><small>“Me too. Tell me more.”</small></div>
                <span className="about-visual__signal">♡</span>
            </div>
            <span className="about-visual__spark about-visual__spark--one" aria-hidden="true">✧</span>
            <span className="about-visual__spark about-visual__spark--two" aria-hidden="true">✦</span>
        </div>
    );
}

export default function About() {
    return (
        <main className="about-page" data-transition-page>
            <AboutScene />
            <div className="about-shell">
                <header className="about-nav">
                    <ChirprBrand />
                    <nav className="about-nav__links" aria-label="Main navigation">
                        <TransitionLink to="/" className="about-nav__quiet">Home</TransitionLink>
                        <span className="about-nav__current" aria-current="page">About</span>
                        <TransitionLink to="/login" className="about-nav__quiet">Log in</TransitionLink>
                        <TransitionLink to="/register" className="about-nav__join chirpr-hover-glow">Get started <span aria-hidden="true">↗</span></TransitionLink>
                    </nav>
                </header>

                <section className="about-hero" aria-labelledby="about-hero-title">
                    <div className="about-hero__copy">
                        <div className="about-eyebrow"><span className="about-eyebrow__light" /> GET TO KNOW CHIRPR</div>
                        <h1 id="about-hero-title">A little thought.<br /><span>A bigger connection.</span></h1>
                        <p className="about-hero__intro">
                            The best parts of the internet start with people. A passing thought,
                            a shared interest, a conversation that goes somewhere unexpected.
                            That’s the feeling we want to build Chirpr around.
                        </p>
                        <div className="about-hero__actions">
                            <TransitionLink className="about-action about-action--primary chirpr-hover-glow" to="/register">Be part of it <span aria-hidden="true">→</span></TransitionLink>
                            <a className="about-action about-action--outline" href="#the-idea">Explore the idea <span aria-hidden="true">↓</span></a>
                        </div>
                        <div className="about-hero__note"><span aria-hidden="true">✦</span> Small thoughts. Big connections.</div>
                    </div>
                    <ConversationVisual />
                </section>

                <section className="about-story" id="the-idea" aria-labelledby="about-story-title">
                    <div className="about-story__heading">
                        <span className="about-section-kicker">THE IDEA BEHIND CHIRPR</span>
                        <h2 id="about-story-title">Social media should<br /><span>feel social again.</span></h2>
                    </div>
                    <div className="about-story__body">
                        <p>Some of the most meaningful connections begin with something small: a question, a joke, a moment you wanted to share.</p>
                        <p>Chirpr is being designed as a place for those moments. A familiar way to post, connect, and explore — with a little more personality and a little less noise.</p>
                        <div className="about-story__signature"><span aria-hidden="true">↗</span> Built around people, not just posts.</div>
                    </div>
                </section>

                <section className="about-values" id="values" aria-labelledby="about-values-title">
                    <div className="about-values__header">
                        <div>
                            <span className="about-section-kicker">WHAT WE'RE BUILDING TOWARD</span>
                            <h2 id="about-values-title">A place to <span>belong.</span></h2>
                        </div>
                        <p>Three simple ideas behind the experience we’re shaping.</p>
                    </div>
                    <div className="about-values__grid">
                        {values.map(value => (
                            <article className="about-value" key={value.number}>
                                <div className="about-value__top"><span className="about-value__icon" aria-hidden="true">{value.icon}</span><span className="about-value__number">{value.number} / 03</span></div>
                                <h3>{value.title}</h3>
                                <p>{value.description}</p>
                                <span className="about-value__line" aria-hidden="true" />
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-cta" aria-labelledby="about-cta-title">
                    <div className="about-cta__flare" aria-hidden="true" />
                    <span className="about-section-kicker">YOUR STORY IS PART OF IT</span>
                    <h2 id="about-cta-title">The next conversation<br />could start with <span>you.</span></h2>
                    <p>Chirpr is taking shape. Come explore the idea, and imagine what we can make of it together.</p>
                    <div className="about-cta__actions">
                        <TransitionLink className="about-action about-action--primary chirpr-hover-glow" to="/register">Create your account <span aria-hidden="true">↗</span></TransitionLink>
                        <TransitionLink className="about-action about-action--outline" to="/login">Already have an account?</TransitionLink>
                    </div>
                </section>

                <footer className="about-footer">
                    <TransitionLink to="/" className="about-footer__brand">chirpr<span>.</span></TransitionLink>
                    <span>© {new Date().getFullYear()} Chirpr · Every thought deserves to take flight.</span>
                    <TransitionLink to="/" className="about-footer__home">Back to home ↑</TransitionLink>
                </footer>
            </div>
        </main>
    );
}
