import React from 'react';

// One short-lived layer, only mounted on successful demo form submission.
const PARTICLES = Array.from({ length: 46 }, (_, index) => ({
    x: (index * 47 + 11) % 100,
    y: (index * 67 + 23) % 100,
    dx: ((index * 23) % 190) - 95,
    dy: ((index * 41) % 220) - 110,
    delay: (index % 8) * 35,
    size: 2 + ((index * 3) % 7),
}));

export default function AuthDissolveParticles({ active }) {
    if (!active) return null;
    return (
        <div className="auth-dissolve-particles" aria-hidden="true">
            {PARTICLES.map((particle, i) => (
                <i key={i} style={{
                    left: `${particle.x}%`, top: `${particle.y}%`,
                    '--particle-x': `${particle.dx}px`, '--particle-y': `${particle.dy}px`,
                    '--particle-delay': `${particle.delay}ms`, '--particle-size': `${particle.size}px`
                }} />
            ))}
        </div>
    );
}
