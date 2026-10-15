Chirpr — Smooth feed reflow after delete / hide
================================================

Install
-------
1) Back up your Chirpr project folder.
2) Extract Chirpr_smooth_feed_reflow_patch.zip into your project ROOT
   (the directory containing package.json), preserving folder structure.
3) Restart npm start. No new dependencies.

What changed
------------
* src/components/useFeedReflow.js       NEW: records card positions before
    a confirmed deletion/hide and animates remaining cards to their final
    positions using requestAnimationFrame-free Web Animations API / FLIP.
* src/components/feedReflow.css         NEW: GPU-friendly will-change and
    scroll anchoring behavior; avoids replacing your customized App.css.
* src/pages/feed.jsx                   Hooks the main feed into reflow.
* src/pages/account.jsx                Hooks profile chirp/media/likes feeds
    into reflow.
* src/__tests__/feedReflow.test.jsx     NEW: focused regression tests.

Behavior
--------
After a post's existing shatter effect finishes, each remaining card moves
up into its new position over ~590ms with a smooth ease-out. It also works
for Hide chirp. Animated posts remain in normal document flow, so the list
isn't permanently shifted. Reduced-motion preferences are respected.
There is no change to the delete/hide backend behavior, data persistence,
fragment scrolling or media upload effects.

Verification
------------
CRA production build compiled using DISABLE_ESLINT_PLUGIN=true.
All 16 tests passed. Physical browser/mobile animation QA was not completed.
