# Chirpr — Consistent Scroll Shards (October 14, 2026)

Apply this **patch at the Chirpr project root** (the folder containing `package.json`). Back up modified files before overwriting. Based on the previous `Chirpr_text_post_animation_performance_patch.zip` build.

## Fixed

- **All post types can fragment**: normal text, decorative media posts, uploaded-image posts, and uploaded-video posts. The previous renderer excluded *all* posts with `attachment` or `media`.
- **Real media is not cloned into the shards**: one interactive image/video player stays in the post's real base. Moving shards show a safe lightweight media silhouette, never sensitive image/video pixels or duplicated player instances. Content warnings and review gating on the real attachment remain unchanged.
- **Tall posts no longer get stuck in a partially assembled state**: each edge of the post animates through its respective entry/exit zone. Posts taller than the viewport remain fully formed in the middle.
- **Lazy shards appear reliably**: the scroll controller repaints when the near-viewport observer mounts the shard layer, even if the window has not scrolled since.
- **Hashtag feeds now use the same fragment controller** as the main feed, account feeds, and groups.
- **Preserved**: randomized patterns between completed transitions, reversible motion when scrolling back, 8 shards on desktop / 4 on mobile, reduced-motion preferences, deleting/hiding self-destruction, FLIP feed reflow, and text-only composer flight.

## Changed files

- `src/components/useScrollFragments.js`
- `src/components/shardConsistency.css` **(new file; no App.css overwrite)**
- `src/pages/feed.jsx`
- `src/pages/hashtag.jsx`
- `src/__tests__/fragmentPerformance.test.jsx`
- `src/__tests__/shardScrollConsistency.test.js` **(new test)**

## Verification

- Production React build: **PASS** (`DISABLE_ESLINT_PLUGIN=true` to work around the existing ESLint setup).
- Automated tests: **26 passed, 8 suites**.
- Physical mobile scrolling and visual transitions: **not yet verified**.

## Notes

1. Stop/restart `npm start` and hard refresh after updating.
2. Look at both plain-text and media posts in `/feed`, `/users/<username>`, `/groups/<id>`, and `/hashtag/<tag>` while scrolling in both directions.
3. The media shard visual intentionally shows an abstract placeholder, not copies of sensitive video frames.
4. If you have edited `feed.jsx` locally since the previous patch, diff your file with this version before overwriting it.
