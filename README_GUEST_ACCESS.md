# Chirpr — Guest sign-in (frontend-only)

This patch adds an accessible **Sign in as guest** button to Home, Login, and Create Account.

- No username, password, or account registration is required.
- Guests see their own distinct **Guest Explorer** profile, rather than being signed in as Keegan or any other demo account.
- Guest entry uses the same dissolve-to-feed transition as the existing demo sign-in (instant with reduced-motion enabled).
- Guest activity in React state (posts, reactions, messages, follows, groups, themes and profile edits) is temporary and does not overwrite saved demo-account data. In-memory guest changes can disappear on page refresh and are reset on sign-out. Guest media files are cleaned up on sign-out when still associated with in-memory guest posts; an interrupted upload or page refresh may leave a locally stored file.
- The guest identity survives a page refresh within the current browser tab using sessionStorage. Signing out ends the guest session and returns to Home with the existing sign-out animation.
- Existing demo login/registration, pages, profiles, and transitions are preserved.

## Install

Back up your current project. Extract the ZIP into your Chirpr project root, alongside `package.json`, allowing matching `src/` files to be replaced. Restart `npm start`. No new dependencies are required.

## Verification

- Production build: passed (`DISABLE_ESLINT_PLUGIN=true CI=true` with React Scripts).
- Automated tests: 60 passed / 13 suites, including five new guest-specific tests.
- Physical-device and interactive browser animation validation: not completed here.

**Reminder:** Guest sign-in is only a frontend preview mode. It is not production authentication or an anonymous server account. A backend will be necessary for real persisted guest sessions and secure permissions.
