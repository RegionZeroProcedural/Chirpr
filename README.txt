CHIRPR — SCROLLBAR-FREE MEDIA STUDIO PATCH

Install: Unzip into the Chirpr project root (the folder containing package.json),
merging the src folder. Back up your existing src/App.css and
src/components/MediaUploadModal.jsx before replacing them. Restart npm start.

Files changed:
- src/App.css
  * Hides native scrollbar tracks throughout Chirpr without disabling scrolling.
  * Reworks Media Studio into a fixed glass shell with a fixed close button,
    heading, and action footer. Standard desktop heights show the form without
    scrolling the full dialog. On smaller screens, only the form fields scroll
    silently (without a visible scrollbar), so all controls remain reachable.
  * Condenses the preview and spacing on smaller viewports.
- src/components/MediaUploadModal.jsx
  * Groups form fields into the internal content area to prevent the entire
    modal from jumping/scrolling and keeps the Post button anchored.
  * Locks both document root and body scrolling while open, restoring prior
    values on dismissal, upload, or component unmount.

Preserves: send->background upload, paper-airplane progress, X self-destruction,
Reels switch, moderation settings, and media validation.

Validation: JSX and CSS parse passed; all 4 async-media tests passed; a React
production build compiled with DISABLE_ESLINT_PLUGIN=true (the project's
pre-existing ESLint setup was not evaluated by that build).
