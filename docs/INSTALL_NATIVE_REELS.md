# Chirpr — native creator videos + media studio + groups

This update REPLACES the third-party Reels API concept with a local-first creator library. It merges into the existing Chirpr React/CRA project and retains the portal route transition, personal themes, profile reveal, and existing fragment-scrolling and self-destruct animations.

## Installing the patch

1. Back up your current `src/`, `public/` and `server/` directories.
2. Extract `Chirpr_native_media_groups_patch.zip` into your **project root** (the folder with `package.json`), allowing changed files to overwrite. Do not extract into `src/` itself.
3. Restart `npm start`. **No new npm dependencies required.**
4. Optional cleanup: delete obsolete `src/data/reelProviders.js`, `server/reels-api.js`, `server/reels-api.test.js`, and your previous `REELS_API_SETUP.md`. They are no longer imported or used. Back them up first if you modified them.

The full-source ZIP includes `public/index.html`, the latest integrated `src/`, optional `server/` files, tests and a reference `package.json`. It excludes `node_modules` and build outputs.

## What to try

- Sign in with nonempty demo credentials; open `/account`. Select the Chirps tab, click **Add photo / video**. The frosted-glass modal opens from the button. Choose an image or MP4/WebM video, caption it, choose a content notice and post.
- Videos have **Also submit to Chirpr Reels** set to OFF by default. Enabling it adds a submission to **Reels → My submissions**. Approved public feeds remain empty until a real moderation and review service is connected.
- In a composer, type `@ja` and select the suggested user. Type `#chirpr` to create a linked hashtag. Tap the tag to open `/tags/chirpr`.
- Visit `/groups` to search, create and join communities. Group posts are kept separate from the main feed. Group posts also support media.
- Check `/feed` and `/users/keegan`: images/videos are displayed in their author's themed posts, blurred by default when unreviewed or marked sensitive. Viewers who are not the author cannot reveal unreviewed attachments.
- When you create a media post from your own profile, a luminous paper airplane leaves the modal, waits for the browser storage and optional scan, returns from the top, and expands into the newly created chirp.

## Local storage and prototypes

- Posts, membership, and captions are saved in browser `localStorage`.
- Binary image/video data is stored in **IndexedDB**. This avoids attempting to put huge data URLs into localStorage.
- Different browsers and devices do **not** share their own local uploads. Cleared site data removes uploads.
- Your original profile themes, login transitions and post actions are retained.
- Accepted files: JPEG, PNG, WebP, GIF (up to 12MB), MP4/WebM (up to 40MB). File types are checked by browser-declared MIME only; a public backend must sniff/validate bytes independently.

## Optional local moderation signal bridge (Node 20+)

This does **not** create an online moderation service or automatically approve content. It can obtain preliminary text/image moderation signals for a LOCAL development session; all results remain review-required.

PowerShell in the project root:

```powershell
Copy-Item server\.env.example server\.env
# Edit server/.env and set OPENAI_API_KEY if you want optional text/image signals.
node --env-file=server/.env server/moderation-gateway.cjs
```

Start `npm start` in a second terminal. The bridge listens on **127.0.0.1:8790** and only allows `http://localhost:3000` through its CORS setting. No key means all uploaded media stays pending. Keep API keys server-side; never place them in `src/`, `public/`, or `REACT_APP_*` variables.

See `docs/MODERATION_REQUIREMENTS.md` before you consider opening user uploads to the public internet.

## Running checks

```powershell
npm test -- --watchAll=false
```

A production build is also supported (`npm run build`). ESLint was disabled for the verification build only because of the existing local lint configuration issue; the code itself transpiles successfully.
