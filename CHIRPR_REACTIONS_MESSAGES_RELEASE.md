# Chirpr — Reactions, messaging, automatic media warnings & fast mobile routes

## What's new

- **Chirp reactions**: tap Like for the usual interaction; press and hold about 420ms or click the arrow to pick 👍 ❤️ 😆 😮 😢 😠. Reactions replace the previous one for that viewer. Icons for the most common reactions appear beside the combined total (including existing demo like counts).
- **Messages**: unsend your own message, react to a message, forward it to another demo user, and attach an image or video. Unsent messages display a tombstone. A previously forwarded copy is a separate message and is not recalled when the source is unsent. Media uses IndexedDB, so recipients exist **only in the same browser's demo dataset**.
- **Automated warnings**: When an API key is configured on the local gateway, sexual and violent imagery classifications add an automatic content notice and blur. Severe results block the attachment. Uploaders may appeal a blocked image; reports and appeals are the intended manual-review triggers. Unavailable scans remain restricted.
- **Video**: Sampling five images can flag visible content but does **not** clear a video for public Reels. Full-frame/audio review remains future backend work. This is a deliberate fail-closed limitation.
- **Mobile navigation**: expensive split-page snapshots and full geometry portals are skipped on touch/mobile. Page signatures are shorter (310ms), Reels entrances are lightweight (430ms), and profile reveals omit decorative fragments on mobile. Desktop cinematic transitions remain.

## Install

1. **Back up** your current Chirpr project or commit it in Git.
2. Extract `Chirpr_reactions_messages_mobile_patch.zip` into the **project root** containing `src`, `public`, and `package.json`. Preserve folder structure and allow matching files to be replaced. This patch is based on `Chirpr_ui_polish_full_source.zip` + the bird-logo patch + the latest rechirps fix.
3. Run `npm start` as usual. No new frontend packages are required.

### Optional automatic image classification during development

With Node 20.6+ installed, copy `server/.env.example` to `server/.env` and enter an API key in `OPENAI_API_KEY`. Start the local gateway in another terminal:

```powershell
node --env-file=server/.env server/moderation-gateway.cjs
```

The gateway runs on `127.0.0.1:8790` and accepts calls only from the configured React origin. The key remains on the server. **Do not deploy this local gateway as a public upload authority.** It is not authentication, antivirus, CSAM detection, complete video/audio scanning, or public content moderation.

If the gateway cannot reach the classifier, uploads remain **scan incomplete** rather than appearing safe. This is intentional.

### Messages and encryption

The current demo stores message bodies in the browser's `localStorage` and attachments in IndexedDB. **It is not encrypted end-to-end or production-private**, and unsending is a UI-state operation, not a secure erasure guarantee. Genuine end-to-end encrypted messaging requires an authenticated key exchange, per-device key management, encrypted attachment storage, and synchronization via your future backend; it must not be simulated by simply hiding or obfuscating plaintext.

### QA suggestions

Test short taps and long presses on desktop/mobile, emoji totals after account switching, unsending and forwarding messages in both demo accounts, attaching images and videos, submitting a report or appeal, unavailable scanner behavior, and route navigation on a phone. React build/tests were run locally, but device frame rates and the external moderation service were **not** verified live.
