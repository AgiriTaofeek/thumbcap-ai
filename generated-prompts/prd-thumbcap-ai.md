# ThumbCap AI — Product Requirements Document (PRD)

## 1. Introduction/Overview
ThumbCap AI helps YouTube creators increase video click-through rate (CTR) and reduce time spent on thumbnails and captions. It automates keyframe extraction, thumbnail generation, caption creation, and smart recommendations using managed Google Cloud services. The product delivers a serverless pipeline triggered by a video upload, with a clear review, edit, and publish flow to YouTube.

## 2. Goals
- Deliver first thumbnails and caption options within 5 minutes for a typical 10–20 minute video.
- Improve thumbnail CTR by recommending data-driven variants (+10–20% target uplift).
- Provide an end-to-end, reliable, and scalable workflow using fully managed GCP services.
- Reduce manual work by automating thumbnail styles, captions, and localization.
- Make publishing to YouTube seamless with secure OAuth integration.

## 3. User Stories
- As a creator, I upload a video and within minutes receive 3–5 thumbnail options scored by predicted CTR.
- As a creator, I receive 3 caption styles (SEO-focused, Hook-style, Friendly) generated from my transcript.
- As a creator, I can edit a chosen thumbnail in-browser and save the final version.
- As a creator, I publish the chosen thumbnail and caption to YouTube via a simple OAuth flow.
- As a marketer, I can view variant scores and recommendations stored in Firestore.
- As a user, I see clear progress and error messages throughout the pipeline.

## 4. Functional Requirements
1. Video Upload & Storage
   - The system must accept video uploads via a signed URL from the frontend and store the file in a Cloud Storage bucket.
   - The system must support resumable uploads and show progress in the UI.

2. Orchestration Trigger
   - When a video upload is finalized, the system must publish a message to Pub/Sub.
   - A Cloud Workflow must start on Pub/Sub ingestion to orchestrate downstream steps.

3. Status & Progress
   - The system must write workflow status updates to Firestore (e.g., uploading, extracting frames, transcribing audio, generating thumbnails).
   - The frontend must poll Firestore or a status endpoint to update a progress bar.

4. Frame Extraction (Cloud Run + FFmpeg)
   - The system must extract high-resolution frames (e.g., every 5 seconds or based on scene changes) and store them in Cloud Storage.
   - The extraction frequency should be configurable.

5. Vision Analysis
   - The system must analyze frames using Vision API for `FACE_DETECTION` and `IMAGE_PROPERTIES`.
   - The system must score frames for “high engagement” and select the top 4 frames.

6. Thumbnail Generation (Vertex AI Generative AI - Imagen)
   - The system must generate thumbnails from selected keyframes using predefined styles without text overlays.
   - Minimum of 5 styles must be produced and saved to Cloud Storage with metadata (style, source frame).

7. CTR Prediction (Vertex AI Prediction)
   - The system must send thumbnail metadata (e.g., color metrics, face count, title context) to a prediction endpoint.
   - The endpoint may run in two modes:
     - Heuristic fallback (rule-based scoring using Vision features and caption keywords).
     - Vertex AI AutoML Regression (if available), trained on an enriched open YouTube dataset.
   - The system must store CTR predictions in Firestore and identify the current recommended winner.

8. Transcription (Cloud Speech-to-Text)
   - The system must process audio (extracted or from the video) in long-running mode and produce a transcript.
   - The transcript must be stored and available to downstream caption generation.

9. Caption Generation (Vertex AI - Gemini/PaLM)
   - The system must generate 3 caption variants (SEO-focused, Hook-style, Friendly) using the transcript and supplied keywords.
   - The system must store generated captions in Firestore.

10. SEO Scoring
   - The system must compute or prompt for SEO and engagement scores (e.g., keyword density, readability) for each caption variant.
   - Scores must be persisted in Firestore.

11. Edit Interface (Frontend + Fabric.js/Konva.js)
   - The system must provide an in-browser editor to adjust images (e.g., color tweaks, overlays, logo placement).
   - On save, the edited PNG must be sent to a backend (Cloud Function or Cloud Run) and stored in Cloud Storage.
   - The editor must support basic templates and text overlays (at least 3 presets).

12. Smart Remix (UI Recommendation)
   - The system must display variant comparisons with CTR scores in the UI and highlight the recommended winner.

13. Publish to YouTube (Cloud Run + OAuth 2.0)
   - The system must enable OAuth with YouTube Data API v3.
   - The system must support both:
     - New uploads: set thumbnail and add title/description with chosen caption.
     - Update existing videos: replace thumbnail and update title/description.
   - The system must securely handle tokens and refresh when needed.

14. Localization (Cloud Translation API)
   - MVP: English-only captions and UX.
   - Future: translations to additional languages (e.g., French, Spanish, Portuguese) can be enabled post-hackathon.

15. Observability & Logs
   - The system must provide structured logs and metrics across Cloud Run and Workflows.
   - The system must trace workflow runs and surface failures with actionable error messages.

16. Error Handling & Retries
   - The system must handle network failures, API quota errors, low-quality audio/video, and NSFW detection gracefully.
   - The system must implement exponential backoff for transient API errors.

## 5. Non-Goals (Out of Scope)
- Full video editing or advanced content moderation beyond basic safety checks.
- Live A/B testing directly on YouTube thumbnails (initially).
- On-premise or multi-cloud deployments.
- Custom model training workflows in the MVP (assume an existing CTR model endpoint).

## 6. Design Considerations (Optional)
- UI should show clear states: Uploading, Extracting, Transcribing, Generating, Scoring, Ready to Review.
- Review screen should present thumbnails with CTR scores and captions with SEO/Engagement badges.
- Editor should prioritize simplicity, with basic adjustments and overlay placement.
- Accessibility: high-contrast, keyboard navigable editor controls, meaningful alt text.

## 7. Technical Considerations (Optional)
- Services: Cloud Storage, Pub/Sub, Cloud Workflows, Cloud Run (FFmpeg + OAuth), Speech-to-Text, Vision API, Vertex AI (Generative + Prediction), Cloud Translation, Firestore, Firebase Hosting.
- Endpoints (examples): `/process`, `/status/:videoId`, `/edit`, `/publish`.
- Firestore schemas (examples):
  - `videos`: { id, userId, status, gcsUri, title, language, createdAt }
  - `thumbnails`: { videoId, variantId, style, gcsUri, visionFeatures, ctrScore }
  - `captions`: { videoId, variantId, type, text, seoScore, engagementScore, translations }
  - `workflowRuns`: { runId, videoId, step, status, startedAt, completedAt }
- Security: OAuth scopes for YouTube (`youtube.upload`, `youtube`), token management, TLS, encryption at rest.
- Content Safety: Use Vision SafeSearch and Vertex AI safety settings to block NSFW/unsafe content before generation/publish.
- Retention: 30 days retention for transcripts and generated assets (configurable), with TTL clean-up jobs.
- Cost Guardrails: Cap Imagen generations to 5 per video; auto-throttle Vertex calls when a per-video budget threshold is reached; set a daily project budget for hackathon (e.g., $50) with alerts.
- Concurrency: Target 100 concurrent videos using Cloud Run scaling (min instances tuned) and Workflows parallelization; implement backpressure via Pub/Sub.

## 8. Success Metrics
- CTR uplift vs. creator baseline (target +10–20%).
- Time-to-first-result (thumbnails and captions): ≤5 minutes for 10–20 minute video.
- Pipeline success rate: ≥95% across upload → generate → publish.
- Edit engagement: % of users who adjust and save thumbnails before publishing.
- Translation turnaround time and accuracy satisfaction (post-hackathon when enabled).

## 9. Open Questions
- Which languages are required beyond French (e.g., Spanish, Portuguese, German)?
- What are cost guardrails per video (budget thresholds, auto-backoff policies)?
- What is the minimum viable set of thumbnail styles to launch?
- Is the CTR prediction model already trained and hosted? If not, what dataset is available?
- How long should transcripts and assets be retained (30/60/90 days)?
- Do we need content safety checks beyond Vision (e.g., policy-based filters)?
- What concurrency targets are expected (e.g., 100+ simultaneous videos)?
- Are there branding requirements for generated thumbnails (logos, fonts)?
- Should the editor support templates or text overlays in MVP?
- What YouTube publishing scenarios must be covered (new upload vs. update existing)?

## 10. Acceptance Criteria (End-to-End)
- User uploads a video and sees progress states in the UI.
- System generates ≥5 thumbnail styles with CTR scores and ≥3 caption variants with SEO/Engagement badges.
- User edits a thumbnail (including optional branding/text overlays) and saves the final PNG to Cloud Storage.
- User publishes the chosen thumbnail and caption to YouTube via OAuth successfully for both new and existing videos.
- Firestore records all artifacts and statuses; logs provide traceability across steps.