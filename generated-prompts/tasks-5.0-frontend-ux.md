## Relevant Files

- `app/routes/home.tsx` - Main page: upload UI, progress, review, editor, publish flow.
- `app/app.css` - Global styles and utility classes for consistent UI.
- `react-router.config.ts` - Routes for `/:videoId/review`, `/:videoId/edit`, `/:videoId/publish`.
- `app/components/UploadForm.tsx` - Resumable upload form and progress UI.
- `app/components/ProgressBar.tsx` - Normalized pipeline states: uploading/extracting/transcribing/generating/scoring/ready/error.
- `app/components/ThumbnailReview.tsx` - Variant grid with CTR scores and recommended winner.
- `app/components/CaptionReview.tsx` - SEO/Hook/Friendly captions with badges and copy button.
- `app/components/EditorCanvas.tsx` - Canvas editor (Fabric.js/Konva) for overlays, placement, color adjustments.
- `app/components/PublishPanel.tsx` - OAuth prompts; update/new publish modes; status feedback.
- `app/lib/api.ts` - Typed client for `/status/:videoId`, `/edit`, `/publish`, upload signed-URL handling.
- `app/lib/firebase.ts` - Optional Firestore client for direct status reads (fallback to status API).
- `public/` - Placeholder assets (e.g., sample logos) for editor overlays.

- `app/components/UploadForm.test.tsx` - Upload flow tests and progress behavior.
- `app/components/ThumbnailReview.test.tsx` - Variant selection and score display tests.
- `app/components/CaptionReview.test.tsx` - Badge rendering, copy action tests.
- `app/components/EditorCanvas.test.tsx` - Editor interactions, export validation tests.
- `app/components/PublishPanel.test.tsx` - OAuth entry points and publish calls tests.
- `app/lib/api.test.ts` - Client request formatting and error handling tests.

### Notes

- Keep the UI simple and fast for hackathon judging; prioritize clear progress and tangible outputs.
- Status polling can use the status API if available; fallback to Firestore reads to avoid blocking.
- For upload, use signed URLs to GCS with CORS configured on the `thumbcap-raw` bucket.
- Editor should include 3 basic templates and text overlays per PRD; limit features to avoid scope creep.
- Accessibility and error states matter for hackathon polish: add focus outlines, roles, and clear error toasts.

## Tasks

- [ ] 5.0 Frontend UX (Upload, Progress, Review, Editor, Publish)

  - [ ] 5.1 Upload Flow with Signed URL
    - Implement `UploadForm` with drag-and-drop and file picker.
    - Request a signed URL from backend (or generate via service) for `thumbcap-raw`.
    - Perform resumable upload; show byte-level progress.
    - On success, derive `videoId` from filename or backend response and route to `/:videoId/review`.
    - Handle CORS and large file errors; show actionable retry button.

  - [ ] 5.2 Status Polling & Progress Bar
    - Implement `ProgressBar` to reflect normalized states:
      - `uploading`, `extracting`, `transcribing`, `generating`, `scoring`, `ready`, `error`.
    - Poll `GET /status/:videoId` every 3–5s; fallback to Firestore reads if API unavailable.
    - Display step icons and timestamps; surface error messages with remediation tips.

  - [ ] 5.3 Review Screen (Thumbnails & Captions)
    - Build `ThumbnailReview`:
      - Grid of variants (min 5 styles) with `ctrScore` and a “Recommended” badge for the winner.
      - Allow selecting a variant for editing.
    - Build `CaptionReview`:
      - Render 3 variants: `SEO`, `Hook`, `Friendly` with `seoScore` and `engagementScore` badges.
      - Add “Copy” button for quick clipboard copying.
    - Show combined summary: selected thumbnail, chosen caption, and option to proceed to edit.

  - [ ] 5.4 Editor Canvas (Image Adjustments & Overlays)
    - Implement `EditorCanvas` using Fabric.js or Konva.js:
      - Load selected thumbnail; support text overlays, logo placement, and basic color adjustments.
      - Provide 3 preset templates (position, font, color scheme).
    - Export final PNG as base64; POST to `/edit` to save to `thumbcap-final`.
    - Update local state and Firestore status to `ready_to_publish` on success.

  - [ ] 5.5 Publish Panel (YouTube OAuth & Actions)
    - Implement `PublishPanel`:
      - Provide OAuth entry (`/oauth/init`) and handle callback result indication in UI.
      - Offer “Update Existing” (requires `youtubeVideoId`) and “Publish New” modes.
      - On submit, POST `/publish` with `mode`, `thumbnailUri`, and optional `title`/`description` (caption).
    - Show publish progress and final success message with links.

  - [ ] 5.6 Error States & Retry UX
    - Centralize API error handling in `app/lib/api.ts`; standardized messages and error codes.
    - In UI, show toasts and inline errors; include retry actions with backoff.
    - Log client-side events for debugging (non-PII) and time-to-first-result.

  - [ ] 5.7 Accessibility & Polish
    - Keyboard navigable controls for upload and editor (tab order, space/enter actions).
    - ARIA roles/labels on interactive elements and progress states.
    - High-contrast theme support and focus outlines; alt text for images.

  - [ ] 5.8 Routing & State Management
    - Update `react-router.config.ts` with routes:
      - `/` (upload), `/:videoId/review`, `/:videoId/edit`, `/:videoId/publish`.
    - Persist minimal state (`videoId`, selected thumbnail/caption) in localStorage for refresh resilience.
    - Guard routes: require `videoId`, redirect to upload if missing.

  - [ ] 5.9 Telemetry & Metrics (Client)
    - Instrument key metrics:
      - Upload start→finish duration; time-to-first-result; editor save latency; publish success.
    - Send telemetry to Firestore or a lightweight endpoint for hackathon dashboards.

  - [ ] 5.10 Component & Integration Testing
    - Use Vitest + React Testing Library:
      - Upload: progress and success routing.
      - Review: scores rendered, selection behavior, recommended badge.
      - Editor: template selection, overlay manipulation, export and save call.
      - Publish: OAuth initiation, payload assembly, success handling.
    - Mock API client responses and Firestore for deterministic tests.

  - [ ] 5.11 Validation Checklist
    - Upload a sample video; verify progress and `videoId` routing.
    - Confirm status updates render correctly across pipeline states.
    - Review: see min 5 thumbnails with scores and 3 captions with badges; select a variant.
    - Editor: export PNG and save; status changes to `ready_to_publish`.
    - Publish: complete OAuth and update existing YouTube video; success message shown.