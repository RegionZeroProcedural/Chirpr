import { useState } from 'react';

// Shared by the visitor landing page and the dedicated login page.
export default function LoginBox({ idPrefix = 'chirpr', required = false, showPasswordToggle = false }) {
    const [passwordVisible, setPasswordVisible] = useState(false);

    return (
        <div className="loginBox">
            <div className="loginBox--row">
                <label className="textRow" htmlFor={`${idPrefix}-username`}>Username or email</label>
                <input
                    id={`${idPrefix}-username`}
                    type="text"
                    name="username"
                    autoComplete="username"
                    required={required}
                    className="login--username"
                    placeholder="you@example.com"
                />
            </div>
            <div className="loginBox--row">
                <label className="textRow" htmlFor={`${idPrefix}-password`}>Password</label>
                <div className="login-password-field">
                    <input
                        id={`${idPrefix}-password`}
                        type={passwordVisible ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        required={required}
                        className="login--password"
                        placeholder="Enter your password"
                    />
                    {showPasswordToggle && (
                        <button
                            className="login-password-toggle"
                            type="button"
                            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                            aria-pressed={passwordVisible}
                            onClick={() => setPasswordVisible(visible => !visible)}
                        >
                            {passwordVisible ? 'Hide' : 'Show'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
