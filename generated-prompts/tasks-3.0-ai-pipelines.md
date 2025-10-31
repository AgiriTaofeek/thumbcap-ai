## Relevant Files

- `services/vision-analysis/src/index.ts` - Vision API analysis; face detection, image properties, engagement scoring.
- `services/vision-analysis/src/index.test.ts` - Unit tests for scoring logic and Vision feature parsing.
- `services/imagen-thumbnails/src/index.ts` - Vertex Imagen thumbnail generation for 5 styles; GCS upload; Firestore metadata.
- `services/imagen-thumbnails/src/index.test.ts` - Unit tests for style generation and metadata persistence.
- `services/captioning/src/stt.ts` - Long-running Speech-to-Text transcription; GCS input; Firestore write.
- `services/captioning/src/gemini.ts` - Gemini caption generation (SEO/Hook/Friendly) and SEO scoring.
- `services/captioning/src/index.test.ts` - Unit tests for transcript parsing, prompt templates, and scoring.
- `services/ctr-prediction/src/index.ts` - Heuristic CTR scorer + optional Vertex Prediction inference client.
- `services/ctr-prediction/src/index.test.ts` - Unit tests for heuristic scoring and endpoint fallback behavior.
- `services/common/firestore.ts` - Firestore Admin utils for read/write across services.
- `services/common/types.ts` - Shared types for videos, thumbnails, captions, workflow runs.
- `services/common/prompts.ts` - Reusable prompt templates for Imagen and Gemini.
- `workflows/thumbcap.yaml` - Orchestration wiring to call services in sequence/parallel.
- `infra/env.example.json` - Config entries for API endpoints, bucket names, regions, and limits.
- `infra/vertex-prediction.md` - Optional Vertex Prediction setup notes (model endpoint, schema).

### Notes

- Use Node.js + TypeScript for services to align with the existing stack.
- Each service should expose a minimal HTTP endpoint for Cloud Workflows/Run invocation (JSON in/out).
- Persist structured metadata in Firestore to support the review UI and status API.
- Apply cost guardrails: limit Imagen generations to 5 variants; bound Gemini tokens; batch Vision calls.
- Enforce content safety: Vision SafeSearch gate before generation; sanitize prompts; restrict styles.

## Tasks

- [ ] 3.0 AI Pipelines (Vision, Imagen, STT, Gemini, CTR)

  - [ ] 3.1 Vision Analysis Service
    - Implement `POST /analyze` that accepts `videoId` and `frameUris[]`.
    - Call Vision API with features: `FACE_DETECTION`, `IMAGE_PROPERTIES`.
    - Compute engagement score (example factors):
      - Face presence and count (prefer 1–2 faces).
      - Smiling/emotion likelihood.
      - Color vibrancy/saturation and contrast (from dominant colors).
      - Composition heuristic (rule-of-thirds approximation based on face bounding box).
    - Select top 4 frames; write to Firestore: `thumbnails` candidates with `visionFeatures`, `engagementScore`.
    - Return selected frames and scores to caller.
    - Unit tests: scoring function with synthetic Vision responses; edge cases (no faces, low color).

  - [ ] 3.2 Imagen Thumbnail Generation Service
    - Implement `POST /generate` that accepts `videoId`, `selectedFrameUris[]`, `styles[]` (5 default styles).
    - Create prompt templates per style (e.g., “Cinematic Glow”, “High Contrast Portrait”, “Vibrant Food Close-up”, “Minimalist Bold”, “Warm Lifestyle”).
    - Call Vertex Generative (Imagen) with source image via GCS URI; ensure safe settings enabled.
    - Save generated images to `thumbcap-thumbnails` bucket with metadata: `style`, `sourceFrame`, `generatedUri`.
    - Write Firestore `thumbnails` docs: link to GCS, style, model parameters, generation timestamp.
    - Enforce cost guardrails: limit total variants to 5; short-circuit on errors; log usage metrics.
    - Unit tests: prompt assembly, metadata persistence, style selection defaults.

  - [ ] 3.3 Speech-to-Text Transcription Module
    - Implement `POST /transcribe` that accepts `videoId` and `gcsUri` (or extracted audio URI).
    - Use long-running transcription (enhanced models if available); language set to `en-US`.
    - Optional features: automatic punctuation; word timestamps; diarization off for MVP.
    - Persist transcript to Firestore: `captions` base doc with raw text and confidence summary.
    - Return transcript segments for downstream caption generation.
    - Unit tests: transcript parser with mocked responses; failure handling (quota, low-quality audio).

  - [ ] 3.4 Gemini Caption Generation & SEO Scoring
    - Implement `POST /caption` that accepts `videoId`, `transcript`, `keywords[]`.
    - Generate 3 variants: `SEO`, `Hook`, `Friendly` using controlled prompt templates:
      - Include constraints: length targets, keyword inclusion, tone guidance.
    - Compute SEO metrics:
      - Keyword density; readability (Flesch-like heuristic); sentiment balance; call-to-action presence.
    - Write Firestore `captions` docs: variant type, text, `seoScore`, `engagementScore`, `keywordsUsed`.
    - Unit tests: prompt assembly; scoring metrics; bounds checking (length, keyword presence).

  - [ ] 3.5 CTR Prediction Service
    - Implement `POST /predict` that accepts `videoId`, `thumbnailVariants[]` with metadata:
      - Vision features, style, dominant colors, caption keywords, title context.
    - Heuristic scoring (fallback):
      - Weighted sum: engagement score (from Vision) + color contrast score + face smile likelihood + keyword-caption synergy.
      - Normalize to 0–100; rank variants.
    - Optional Vertex Prediction integration:
      - If `VERTEX_PREDICTION_ENDPOINT` is set, call predict API and blend with heuristic (e.g., 70/30 weighting).
    - Persist `ctrScore` per variant in Firestore; set recommended winner.
    - Unit tests: heuristic calculation; endpoint fallback and blending logic.

  - [ ] 3.6 Content Safety & Prompt Hygiene
    - Vision SafeSearch gate on frames before generation; block adult/violent content.
    - Restrict Imagen/Gemini prompts to approved style templates; sanitize user text inputs.
    - Log safety decisions; surface actionable messages in status and Firestore.

  - [ ] 3.7 Shared Libraries and Types
    - Implement `services/common/types.ts` (Video, ThumbnailVariant, CaptionVariant, WorkflowRun).
    - Implement `services/common/firestore.ts` (Admin init, typed reads/writes, collection helpers).
    - Implement `services/common/prompts.ts` (Imagen and Gemini prompt templates; parameters for styles/tones).

  - [ ] 3.8 Integration with Workflows
    - Expose consistent HTTP endpoints across services with JSON request/response.
    - Update `workflows/thumbcap.yaml` to call services:
      - `vision-analysis` → `imagen-thumbnails` → `ctr-prediction`.
      - `stt` → `gemini-captions` → `seo-scoring` (if separate) or combined in captioning service.
    - Propagate `videoId` and `runId` across calls; write status updates to `workflowRuns`.

  - [ ] 3.9 Configuration, Limits, and Cost Controls
    - Add service-level env vars: max styles (5), max tokens for Gemini, retry policy.
    - Implement exponential backoff for transient failures; cap concurrent requests.
    - Document env keys in `infra/env.example.json`.

  - [ ] 3.10 Testing, Mocks, and Local Dev
    - Provide mocked clients for Vision, STT, Imagen, and Vertex Prediction.
    - Write unit tests for core scoring/prompt logic; use fixtures for consistent inputs.
    - Add local dev scripts to run services with sample payloads and verify Firestore writes.

  - [ ] 3.11 Validation Checklist
    - Run end-to-end via Workflows with a sample video; confirm:
      - Top 4 frames selected; 5 thumbnails generated.
      - Transcript stored; 3 caption variants created with scores.
      - CTR scores saved; a winner selected and visible in Firestore.
    - Review logs for safety/guardrail decisions and latency across steps.