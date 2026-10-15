# Chirpr — Text-only posting animation + fragment performance patch

## Install

1. Back up the current project (particularly `src/pages/feed.jsx`, `src/pages/account.jsx` and `src/components/useScrollFragments.js`).
2. Unzip this patch into the **Chirpr project root** (the folder containing `package.json`), preserving directories.
3. Restart the dev server (`npm start`). Hard refresh the tab if styles are cached.

**Base:** Created against the recent **Chirpr_smooth_feed_reflow_patch** after the asynchronous-media, scrollbar and ESLint hotfixes. This patch doesn't replace `App.css`, login, user data, upload processing, or Reels.

## Text-only posting restored

- Posting from the main feed or the logged-in user's profile makes a visually noninteractive copy travel from the composer into the new top post.
- The actual post is created in shared state immediately, concealed until the flight arrives; a gentle landing glow finishes the transition.
- The owner's composer resets above the new post. Media uploads remain on their existing asynchronous paper-airplane route; neither path triggers the other.
- Reduced-motion mode avoids the flight while still publishing normally. A short timeout prevents a missing target from leaving a hidden post.

## Performance improvements

- Offscreen plain-text cards don't mount the full set of clipped, duplicated glass faces until they approach the viewport (IntersectionObserver with a prefetch margin). They are torn down again after leaving the area.
- Touch/compact screens construct only four fragments; desktop constructs eight.
- Cards containing media never create extra copies of decoded images or video.
- Scroll geometry is sampled once per animation frame and only for near-viewport cards, preserving reversible direction-independent motion and randomized reshuffling at completed animation boundaries.
- One ResizeObserver watches the post container rather than subscribing to every post; small mobile toolbar-height changes are ignored to limit jitter.
- The travelling text post uses a single display-only card and a transform + opacity animation instead of full-card animated blur. Mobile media scroll fades no longer incur a large blur pass.
- Derived feed/profile post lists are memoized so typing in the composer doesn't recalculate every post on each keystroke.

## How to check

1. Log in; send a **text-only** chirp from `/feed` and then from your own `/account` page. The card should travel from the composer, arrive at the top, and never remain invisible.
2. Attach an image/video and submit: the existing nonblocking paper-airplane workflow should remain unchanged.
3. Scroll slowly down and back up: randomized fragments should assemble/disassemble smoothly in either direction; mobile should show four moving shards.
4. Hide/delete a post: self-destruct still runs, followed by the 590ms FLIP reflow on survivors.
5. Test another user's profile and reduced-motion preference.

## Validation

- Production CRA build compiled successfully with `DISABLE_ESLINT_PLUGIN=true` (the project still has an existing ESLint setup issue).
- 22 tests passed (including posting, reflow, offscreen shard behavior, four-piece mobile fragments, and no media duplication).
- No measured FPS comparison or physical-device animation benchmark has been performed. Visual results should be checked on your target phone.
