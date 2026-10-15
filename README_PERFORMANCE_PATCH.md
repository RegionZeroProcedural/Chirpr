# Chirpr — Smooth Shard Scroll Performance Patch

## Apply

Back up your working files. Extract `Chirpr_smooth_fragment_performance_patch.zip` into your **project root** (beside `package.json`), allowing the listed files to replace the previous versions. Restart the development server. This patch is based on the immediately preceding **Consistent Shard Scroll Hotfix**; apply that first if needed.

No new npm dependencies. `App.css` is untouched; the new stylesheet is imported by `useScrollFragments.js`.

## What changed

1. **No more 8 full React render trees per scrolling chirp.** Before this patch, each near-visible post rendered a real post plus up to 8 extra copies of its text, links, and glass effects. Shards now use a lightweight author-tinted visual *silhouette*. A post's actual image/video/text, accessible controls, and sensitive-media guard still exist **once** in its normal underlying card. The aesthetic tradeoff is that the post's exact letters no longer fly away inside the fragments; color, shard shape, depth, and motion remain.
2. **Read-all / write-all frame scheduling.** Positions are measured for relevant cards before DOM styles change, reducing forced synchronous layout on long feeds. Mutating animation CSS variables is scoped to the fragment layer and base, avoiding unnecessary recalculation of players and post content.
3. **Only near-screen posts are processed.** A shared near-viewport observer (320 px margin) decides which cards need position measurement; individual components still load the lightweight fragment art lazily.
4. **Fewer redundant mutations.** Styles are quantized to a visually smooth precision and updated only when the computed progress changes. Idle shards are made invisible to reduce overdraw. Mobile background light clouds no longer continuously animate while scrolling.
5. **Visual behavior preserved.** Text and media posts both shard. Four shards are used on touch devices, eight on desktop; randomized layouts refresh only at fully completed ends of the transition, so reversing mid-scroll retains the same pattern. Post destruction, text-only posting flight, the media paper airplane, and FLIP reflow are unchanged. Reduced-motion is honored.

## Check

Navigate to `/feed`, `/users/<username>`, `/groups/<group>`, and `/hashtag/<tag>`, and scroll down/up across posts of various heights. Compare perceived smoothness with the previous patch on the **same device**. On a phone, test slow and fast swipes and reversals. Also delete or hide a post and verify the self-destruction and slide-up reflow.

**Validation run:** `react-scripts build` completed successfully (with the existing `DISABLE_ESLINT_PLUGIN=true` workaround), 28 Jest tests passed across 9 suites. **No hardware FPS measurements or physical-mobile testing were performed.**

## Modified source

- `src/pages/feed.jsx`
- `src/components/useScrollFragments.js`
- `src/components/shardPerformance.css` (new)
- `src/__tests__/fragmentPerformance.test.jsx`
- `src/__tests__/scrollFrameBudget.test.jsx` (new)
