# Chirpr — Social Frontend Expansion

This release applies **on top of** `Chirpr_smooth_fragment_performance_patch.zip`, with the personalized feed and media uploader already present. It is a frontend prototype, not a production social service. All data remains in this browser until a properly authenticated backend is built.

## What changed

- **Social actions:** working local likes, threaded replies, rechirps with feed broadcast cards, saves, shares, post detail pages, follow/unfollow, and report submission.
- **Discover `/discover`:** search users/posts/hashtags and browse suggested people.
- **Activity `/notifications`:** likes, replies, new follows, and direct message notifications, with read status.
- **Messages `/messages`:** local conversation threads, contact switching, message composer.
- **Saved `/bookmarks`:** browser-local bookmarked posts.
- **Account settings `/settings`, `/profileSettings/:uid`:** private account, sensitive blur preference, animation toggle, video autoplay preference, demo account switching, muted/blocked user lists, and signout.
- **Safety `/safety`:** frontend reports and clear disclosure of non-operational production moderation.
- **Registration:** creates a real mock account in the local browser without pretending to authenticate, enabling multiple test accounts.
- **Profile:** functional follow button, follower/following counts, synced liked posts.
- **Groups:** member requests for private groups, membership approval, owner-managed descriptions/rules, removing members, pinning and locally removing group posts.
- **Reels:** reuse post interaction controls for videos; respect preference for disabling automatic playback.
- **Navigation:** added relevant links and a mobile bottom navigation dock.
- **Styling:** dark glass surfaces, restrained chromatic accents, entrance transitions, keyboard-usable dialogs, no new dependencies.

## Preserved from the prior build

- Glass landing and login, personalized account themes, Reels portal, text post flight, upload airplane and background processing, video quarantine pending server approval, hashtags/mentions, self-destructing posts, reflow animation, reversible lightweight shard scrolling, hide/remove post actions, and scrollbars kept hidden.
- Existing `App.css` and fragment engine scripts are retained; this release uses a new scoped `src/features/social/social.css` for new UI.

## Local setup

Back up the original project. Extract the patch ZIP into the folder that contains `package.json` and merge `src/` (do **not** extract inside `src`). Run `npm start` as before. Alternatively use the complete-source ZIP in a fresh folder and install its dependencies with `npm install`. No new npm packages were added.

For a clean local demonstration, sign in with any nonempty credentials. Use `/settings` → **Demo account switching** to simulate multiple people. Test a like on another profile, switch to the other account, and open `/notifications`. Settings, messages, likes and follows are stored under `chirpr-social-v1` in localStorage. Reels remain quarantine-gated and **cannot** be published publicly merely by changing the UI.

## Data retention and security

This frontend uses localStorage and IndexedDB. Local report queues and account/privacy toggles DO NOT constitute server-side moderation, account security or privacy enforcement. Real registration, credential storage, email/password, blocking enforcement, report processing, group role verification, server-side content publication and cross-device sync all need a backend. Do not expose it to real users as a production social platform.

## Verification

- **React production bundle:** compiled successfully using `DISABLE_ESLINT_PLUGIN=true` because the pre-existing development toolchain has an incompatible ESLint/Jest plugin configuration (`jest/globals` unknown).
- **Automated tests:** 10 test suites, **32 tests passed**. Coverage includes previously implemented fragments, upload queue, text flight, feed reflow and new social actions.
- **Browser:** automated headless Chromium navigation couldn't be completed in this runner (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). End-to-end behavior and real mobile FPS remain unverified; test on your hardware before deploying.

## Still required before calling the frontend fully finished

Dedicated notification batching/typing indicators, image cropping and video trimming workflows, mod tooling and appeals, production accessibility audit, robust media retry/cancel queue, cross-browser/mobile performance telemetry, API-backed pagination/discovery ranking, proper offline states, reliable account/session management, and comprehensive browser E2E QA. Real security/moderation will require authenticated server infrastructure.

## Suggested smoke-test order

1. Home → login → feed; post plain text and verify its flight and shards.
2. Like/reply/rechirp, open post thread, save, then verify bookmarks.
3. Switch mock user; check notifications, follow, messaging, profile personalization.
4. Create public/private group, request membership, approve, add and pin a group post.
5. Open Reels; ensure videos remain unavailable publicly without moderation.
6. Check post options report, mute/block, hide/delete and feed reflow.
7. Verify display at 375px, 768px, 1440px and reduced-motion preference.

Rollback: restore the backed-up `src/` and clear test localStorage as needed. The patch does not modify installed packages or delete older data keys.
