# Chirpr moderation — automatic classification prototype

**This build is a local frontend demonstration, not an approved public moderation system.** The current design reserves routine human moderator review for **reported posts** and **appeals** rather than sending every upload for manual approval. Emergency or legally required safety escalation will still need a dedicated process.

## Current implementation

- A Node development gateway (`server/moderation-gateway.cjs`) uses `omni-moderation-latest` for **text and image** classification if a server-side `OPENAI_API_KEY` is configured. It produces `approved`, `sensitive`, `rejected`, or `pending_scan`, and the frontend displays the corresponding local state. There is no rule requiring routine human approval of clean images.
- Automatically detected **sexual imagery** and **non-graphic violent imagery** are labeled and blurred. Severe classifications such as `sexual/minors` or `violence/graphic` result in rejection. Uploaders can file an **appeal** for a rejected post. The existing Report action creates a report record for the eventual human-review queue.
- If the classifier fails, times out, is not configured, or cannot decode the file, media remains in `pending_scan` and is **not approved**.
- For videos, the browser extracts at most five sample frames, sends those frames to the gateway, and applies warnings/blocking if a sampled frame is flagged. **A video with clean sampled frames is NOT approved:** sampled stills miss unsampled frames, moving context, and audio. Full automated video and audio screening is required before publishing to a public Reels feed.
- Media is stored in the local browser's IndexedDB and these moderation statuses are untrusted browser metadata. No public cross-device upload authorization is implemented.

## Before launch (required)

1. Authenticated uploads to quarantined object storage with file hashing, size and MIME validation, malware scanning, and server-enforced moderation states. Never trust browser-submitted `approved` flags.
2. Full-video analysis across the clip, visual overlays, subtitles, audio transcription, and audio safety analysis. Reject unscannable or unsupported content automatically. Treat GIFs/animated images and altered files similarly.
3. Dedicated child-safety systems, suspected CSAM handling, and legal escalation. The general moderation endpoint **is not a CSAM detection tool** and must never receive known or suspected CSAM.
4. Reporting and appeal queues with proper permissions, audit logs, rate limits, and privacy safeguards. Human involvement is designed for reports and appeals in ordinary workflows; extraordinary legal/emergency processes require specialized handling.
5. Review moderation thresholds for false positives and misses, age protections, community guidelines, privacy disclosures, consent for classification via a third-party provider, safe retention, and independent red-team tests.

For local setup, see `CHIRPR_REACTIONS_MESSAGES_RELEASE.md`.
