## Relevant Files

- `app/routes/home.tsx` - Upload UI, review screen, and progress states.
- `app/root.tsx` - App shell, providers (e.g., Firestore client init).
- `react-router.config.ts` - Route setup for upload → review → edit → publish.
- `src/lib/firebase.ts` - Firestore, Storage, and Auth client initialization (frontend).
- `src/api/client.ts` - Typed API client for backend endpoints (`/process`, `/status/:videoId`, `/edit`, `/publish`).

- `services/frame-extractor/src/index.ts` - Cloud Run service: FFmpeg frame extraction, GCS write.
- `services/frame-extractor/Dockerfile` - Container for frame extraction.
- `services/vision-analysis/src/index.ts` - Vision API features + scoring, Firestore writes.
- `services/imagen-thumbnails/src/index.ts` - Vertex Imagen generation for 5 styles, GCS write, Firestore metadata.
- `services/captioning/src/index.ts` - STT transcript + Gemini caption generation + SEO scoring.
- `services/ctr-prediction/src/index.ts` - Heuristic CTR scorer + optional Vertex Prediction call.
- `services/editor-save/src/index.ts` - Receives edited PNG, saves to GCS, updates Firestore.
- `services/publisher/src/index.ts` - YouTube OAuth + publish/update thumbnail/title/description.
- `services/common/firestore.ts` - Shared Firestore admin utils for services.
- `services/common/types.ts` - Shared types for videos, thumbnails, captions, workflow runs.

- `workflows/thumbcap.yaml` - Cloud Workflows orchestration definition.
- `infra/gcs-buckets.md` - Bucket naming and structure (`raw_videos/`, `frames/`, `thumbnails/`, `final/`).
- `infra/iam-roles.md` - Minimal IAM roles for services and CI user.
- `infra/env.example.json` - Config keys (projectId, bucket names, API endpoints).

- `services/frame-extractor/src/index.test.ts` - Unit tests for frame extraction service.
- `services/vision-analysis/src/index.test.ts` - Unit tests for scoring logic.
- `services/imagen-thumbnails/src/index.test.ts` - Unit tests for style generation orchestration.
- `services/captioning/src/index.test.ts` - Unit tests for caption generation + SEO scoring.
- `services/ctr-prediction/src/index.test.ts` - Unit tests for heuristic scoring.
- `services/publisher/src/index.test.ts` - Unit tests for publish/update flows.
- `app/routes/home.test.tsx` - UI tests for upload/review/editor/publish flows.

### Notes

- Unit tests should sit alongside their code files (e.g., `index.ts` and `index.test.ts`).
- Use `npx jest` to run tests, or `npx vitest` if you prefer matching the Vite stack.
- For Cloud Run services, use Node.js + TypeScript to align with project tooling.
- Keep all new code in the current repo, adding folders directly at the root.

## Tasks

- [ ] 1.0 Cloud Foundation & IAM
- [ ] 2.0 Orchestration & Storage Setup
- [ ] 3.0 AI Pipelines (Vision, Imagen, STT, Gemini, CTR)
- [ ] 4.0 Backend Services (Frame Extraction, Editor Save, Publisher)
- [ ] 5.0 Frontend UX (Upload, Progress, Review, Editor, Publish)
- [ ] 6.0 Observability, Safety, Cost & Performance Guardrails