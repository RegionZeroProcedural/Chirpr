# Chirpr UI Polish — route, sidebar, mentions, reply, animation pass

This incremental patch is based on `Chirpr_social_frontend_full_source.zip` (the source accompanying the social frontend completion update). Extract the patch into your project ROOT alongside `package.json`, not into `src`. Back up changed files first, especially if you edited them locally since that release.

## Changes

- **Composer mention menu:** The feed, profile, and group composers acquire a deliberate focus stacking context; suggestion lists now draw above the stream instead of behind the next chirp. No portal required and Escape/selection behavior is unchanged.
- **Mentions:** An `@username` becomes medium-light blue (`#79BBF2`) in published chirps, videos, and while composing. A visual, pointer-transparent overlay mirrors the native text field so the actual textarea preserves selection, keyboard and IME handling. Hashtags retain their existing accent.
- **Desktop feed sidebar:** Outer left rail now sticks beneath the top bar and occupies the remaining viewport height. The “Small thoughts. Big connections.” card and copyright label follow the *bottom* of that rail, instead of disappearing above its lower edge. On shorter desktops, the rail alone scrolls invisibly to keep all links reachable. Responsive mobile sidebar behavior is unchanged.
- **Reply sizing:** Smaller reply text, vertical rhythm and composer. The reply pop-up is less tall and less visually dominant than the chirp being replied to.
- **Mobile fragment visibility:** Shard paint has stronger borders and contrast with slightly wider scattering, while still using only 4 lightweight shards and no duplicated video or costly backdrop blurs. Scroll direction reversal is untouched.
- **Route signatures:** New animation layer gives Feed, Discover, Groups, Messages, Activity, Saved, Threads, Hashtags, Settings, Safety, Profiles, Home, Login, Register and About visually distinct low-cost entrance gestures. The previously existing Reels portal retains responsibility for Reels. These are pointer-transparent and don't hold navigation; reduced-motion users skip them.
- **Sign-out:** A dedicated 690ms closing-glass farewell covers logout, then replaces the route with Home. The session is only cleared after the exit completes; reduced motion completes immediately. All sign-out controls share the same callback.

## Verification

- **CRA production build: compiled successfully** with `DISABLE_ESLINT_PLUGIN=true` (the established workaround for the project's pre-existing ESLint configuration problem).
- **52 automated tests passed across 11 suites**, including the new navigation, blue-mention, live-editor and sign-out checks.
- Parsed all 76 JavaScript/JSX and 8 CSS source files, validated relative imports and CSS syntax.
- **Limitations:** Interactive browser testing was blocked by the container's local-address policy. Physical-device animation, sticky-sidebar and tooltip layering still require visual confirmation in your browser. The existing ESLint workaround remains necessary.

## Basic smoke test

1. Run `npm start`.
2. Start a feed post with `@ja`, confirm suggestion box overlays (rather than hides behind) the next chirp. Select James, confirm his handle appears light blue in the textarea and when posted.
3. On desktop, scroll the feed: the full left rail stays visible and the motto and footer stay at the bottom. Shorten the window: links remain reachable inside the hidden-scrollbar rail.
4. Open Reply: its dialog and thread replies should be more compact.
5. Navigate into Feed, Discover, Groups, Messages, Saved, a Profile, Settings, Activity and Reels, then sign out. Each destination should have its own animation; Reels still uses the portal.
6. On mobile, scroll slowly over a text chirp and a video chirp, reverse midway and ensure the four painted shards are visible and retain their pattern until the cycle completes.
