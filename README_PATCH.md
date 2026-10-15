CHIRPR — NON-BLOCKING MEDIA DELIVERY + MODAL SELF-DESTRUCT PATCH
================================================================

APPLY
1. Back up your current source folder.
2. Extract this patch at the project root (the folder with package.json).
3. Allow it to merge src/ files. No npm packages are required.
4. Restart npm start and refresh the browser.

BEHAVIOR
- Submit a media post: the glass modal folds into a flying paper airplane;
  the page is usable ~140 ms after submitting rather than staying blocked.
- File saving and the optional moderation SIGNAL continue in an in-tab queue
  while the user navigates between Chirpr routes.
- A small bottom-corner glass notification shows progress, completion, or
  failure without stealing focus or blocking scrolling.
- If a profile upload finishes while the creator is viewing their own profile
  and the new post is onscreen, the plane returns to that post and highlights
  its arrival. Otherwise the notification offers a View post link.
- X, Escape, Cancel or click-outside causes the modal glass to scatter into
  nine randomized pieces, then releases the overlay. The action does NOT
  create any post or upload anything.
- Reels submissions remain off by default; no unmoderated media becomes
  publicly approved just because the upload completed.

IMPORTANT LIMITATIONS
- This is a frontend-only IN-TAB queue, not a service worker or backend.
  Reloading/closing the tab while processing can interrupt an upload.
- Media is stored in this browser's IndexedDB only, not uploaded to a server.
- The optional scanner is a preliminary signal, not a public approval.
  Public distribution remains pending until authenticated backend moderation
  (including video/audio review) exists.

TESTING
- Tested: 14 Jest checks pass (including 4 focused asynchronous upload tests).
- React production build compiled successfully with the existing lint-plugin
  workaround: CI=false DISABLE_ESLINT_PLUGIN=true npm run build
- Full desktop/mobile interactive browser validation was unavailable in this
  environment. Verify X animation and airplane landing on your own browser.

FILES
- src/App.js                         Adds persistent upload activity layer.
- src/App.css                        Adds shatter, flight and progress styles.
- src/components/MediaUploadModal.jsx    Fast-close send and animated dismiss.
- src/components/UploadActivityLayer.jsx App-level plane and notification UI.
- src/data/mediaUploadQueue.js       Background-in-tab upload state machine.
- src/pages/account.jsx              Immediate composer reset; profile source.
- src/pages/feed.jsx                 Immediate composer reset.
- src/pages/groups.jsx               Immediate composer reset.
- src/__tests__/asyncMediaUX.test.jsx Focused regression tests.
