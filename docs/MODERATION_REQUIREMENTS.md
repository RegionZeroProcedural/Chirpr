# Chirpr content safety — current status and production requirements

## What is implemented TODAY

1. **No auto-public uploads.** All new images, videos and demo chirps start `pending_review`. Reels' public community list will only use media carrying an explicit `approved` status. This frontend does not issue approvals. The personal "My submissions" view is an author-only browser-local preview.
2. **Default blur and explanations.** Unreviewed media is blurred for its author, with an explicit warning and an intentional "Show media anyway" action. Other mock viewers get a quarantine placeholder with no reveal. User-declared content warnings (e.g. graphic imagery, nudity, flashing lights) produce a labeled blur even after review.
3. **Local-only optional signal server.** `server/moderation-gateway.cjs` calls the provider's text+image classifier if configured. It can return categories and report the need for review; it **never** issues a public approval. When offline or failing, it returns pending review. API keys stay server-side.
4. **Fail-closed videos.** Videos are not automatically approved, because a still-image classifier is not a comprehensive video or audio safety system. Videos require dedicated frame and audio checks and a human approval path.
5. **MIME/size browser checks** plus a private IndexedDB store. This is NOT malware or security screening, nor an authenticated upload service.

## What is NOT implemented yet (mandatory before real public launch)

- Real accounts/authentication; server-side permissions on posts, groups, membership, review roles, likes and edits. Frontend `isOwner` is not authorization.
- Durable object storage and a server-issued upload session, content hashing, byte-level MIME validation, virus screening and quarantine. Unreviewed objects must NEVER be served from public CDN endpoints.
- Automated text and image moderation on the SERVER. Redact/private-protect data before forwarding to external services, include privacy disclosures and retention rules. Image moderation covers only some classes of harms.
- Full video moderation: process the entire clip, sample enough frames / keyframes, inspect thumbnails and overlays, run audio transcription plus audio safety checks and require review where uncertain. Recheck edits and re-encodes; reject unscannable files. Limit codec, dimensions, duration and frames.
- A dedicated child-safety/CSAM detection and legal escalation workflow using specialized tools and expert/legal guidance; the generic moderation endpoint is not a substitute and must not be used for known or suspected CSAM.
- Per-policy decisions: block illegal/exploitative uploads, route uncertain material to human review, put allowed sensitive content behind clearly labeled opt-in blur and apply age rules where required.
- Real report/flag queues, group moderators, appeals, takedown handling, immutable audit logs, spam/rate limits, repeat-offender controls and moderator permission boundaries.
- **Server-signed moderation decisions.** Never trust `post.attachment.moderation.status = 'approved'` from a React client or a localStorage value. Only the backend can move media from pending to approved, and only after review. Public Reels must query the backend's approved content library.
- Privacy-preserving deletion (including all transcoded files and previews), retention controls and compliance review before beta.

## Staged implementation plan

**Phase 1 — Frontend prototype (this patch):** media studio, private media store, user opt-in for Reels, tagged blur, creator reels view, post mentions/hashtags, groups, paper airplane transition.

**Phase 2 — Private moderated upload service:** user auth, chunked uploads, private object storage, asynchronous job queue, text/image scanning, video frame/audio workflow, content policies and human review dashboard, server-approved statuses, safe thumbnails, shared relational post database.

**Phase 3 — Community/public beta:** approved Reels feed, reporting, moderator actions, group roles, content discovery/recommendations, rate limits, observability and appeal process.

Do NOT advertise this frontend as already performing comprehensive content moderation. It deliberately prevents unreviewed media from entering a real public feed until the remaining work exists.
