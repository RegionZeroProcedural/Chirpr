# Chirpr — live-platform Reels and React Hooks fix

## Install (project root, NOT src/)

Extract the patch into the folder containing your existing `package.json`. The patch
replaces `src/pages/account.jsx`, `src/pages/reels.jsx`, and `src/App.css`, and adds
`server/reels-api.js` + `server/.env.example` + tests. Back up your current files first.
The full-source ZIP also contains `public/index.html` to fix the earlier CRA error.

## Start the real Reels API (no additional npm dependencies)

1. Create `server/.env` by copying `server/.env.example`.
2. Obtain an API credential for at least one platform, and paste it into `server/.env`.
3. In a SEPARATE terminal at your Chirpr project root, run:

    node server/reels-api.js

4. In the existing frontend terminal run:

    npm start

5. Visit `/reels`. Selecting the provider loads the first API results automatically.
   More results are fetched when you reach the bottom (with a Load more backup button).

You can check that the bridge is running by opening:
    http://127.0.0.1:8787/api/reels/health

Example: For YouTube, enable the YouTube Data API v3 in Google Cloud and set
`YOUTUBE_API_KEY` in server/.env. The API returns public short-DURATION videos, but
it does **not** offer a Shorts-only discovery flag, so results may include videos
that are not vertical Shorts. Search is quota-limited; the local bridge caches
results for five minutes.

For Twitch, create a Twitch developer app and provide TWITCH_CLIENT_ID and
TWITCH_CLIENT_SECRET. The UI searches clips by game/category, default Minecraft.

For Vimeo, obtain an API access token (public scope). The UI searches public videos.

For TikTok, you need an approved Display API application and a TikTok OAuth user
token with the video.list scope. The API only lists THAT AUTHORIZED CREATOR's public
videos, not a general For You feed.

For Instagram, you need an approved professional-account integration and an
Instagram OAuth access token + Instagram User ID with permission to read that
account's media. The API only lists authorized account media; it is not a public
Reels recommendation API.

You can still paste video links into the Save a Video Link form without credentials.
Saved links are clearly labeled as such, NOT presented as automatically obtained
API videos, and are stored in this browser's localStorage.

Some video embeds can be blocked by the source service or by the uploader. The
"Visit source" link is always provided. Videos play only when clicked and
stop when their card scrolls out of view.

## Fix for conditional React Hooks

`src/pages/account.jsx` had an early `if (!profileUser) return ...` BEFORE the
useLayoutEffect / useEffect posting animation hooks. It is now AFTER all hooks
but BEFORE the final JSX return. No hooks are called conditionally.

## Validation

From project root (Node.js >=20):
    node --test server/reels-api.test.js

No third-party npm packages are needed by the API bridge. A full CRA compile still
requires your local React dependencies, which this package does not install.

### Deployment note

This localhost bridge is for development. For production, put provider integrations
behind a secure authenticated backend, add caching/rate-limiting, use provider OAuth
flows and token refresh, and configure allowed origins. Do not commit `.env`.
