## Relevant Files

- `services/frame-extractor/src/index.ts` - Cloud Run service: FFmpeg frame extraction from GCS to `thumbcap-frames`.
- `services/frame-extractor/Dockerfile` - Container with FFmpeg and Node.js runtime.
- `services/editor-save/src/index.ts` - Cloud Run service: receives edited PNG and saves to `thumbcap-final`.
- `services/editor-save/Dockerfile` - Container for editor save service.
- `services/publisher/src/index.ts` - Cloud Run service: YouTube OAuth and publish/update thumbnail/title/description.
- `services/publisher/Dockerfile` - Container for publisher service.
- `services/common/firestore.ts` - Firestore Admin initialization and helpers.
- `services/common/gcs.ts` - GCS helpers: signed URLs, upload/download streams, path builders.
- `services/common/secrets.ts` - Secret Manager helpers for OAuth client ID/secret and tokens.
- `services/common/types.ts` - Shared types: `Video`, `ThumbnailVariant`, `CaptionVariant`, `WorkflowRun`.
- `scripts/deploy-services.sh` - Deploy/update Cloud Run services with required env vars and IAM bindings.
- `infra/secret-manager.md` - Store and manage YouTube OAuth credentials and service secrets.
- `infra/youtube-oauth.md` - Scopes, consent screen, callback URL setup, and flow description.
- `workflows/thumbcap.yaml` - Orchestration: calls backend service endpoints in sequence/parallel.
- `services/frame-extractor/src/index.test.ts` - Unit tests: frame extraction command, naming, GCS writes.
- `services/editor-save/src/index.test.ts` - Unit tests: image validation, GCS write, Firestore update.
- `services/publisher/src/index.test.ts` - Unit tests: OAuth flow, publish/update API calls and error handling.

### Notes

- Runtime: Node.js + TypeScript for consistency; use Express or Fastify for minimal HTTP endpoints.
- FFmpeg: Use Debian-based image with `ffmpeg` installed (Alpine often misses some codecs needed).
- GCS: Prefer streaming reads/writes to avoid large local files; use temporary disk if required (`/tmp` in Cloud Run).
- Security: Validate inputs, enforce size limits (e.g., ≤10MB for edited PNG), sanitize filenames, and restrict content types.
- OAuth: Use Google Secret Manager for client ID/secret; store user tokens with encryption and limited retention.
- IAM: Each service runs with its own service account, granted least privilege (Storage read/write, Firestore user, Secret accessor).
- Cost/Performance: Batch Vision calls; limit Imagen to 5 styles; cap concurrency; use backoff on transient errors.

## Tasks

- [ ] 4.0 Backend Services (Frame Extraction, Editor Save, Publisher)

  - [ ] 4.1 Frame Extraction Service (Cloud Run + FFmpeg)
    - Implement `POST /extract` with payload:
      - `videoId: string`, `gcsUri: string`, `fps: string` (default `1/5` → 1 frame per 5 seconds), `scaleWidth: number` (default `1280`), `sceneDetect: boolean` (optional).
    - Download or stream the video from GCS:
      - If using local processing, stream to `/tmp/input.mp4`.
    - Run FFmpeg to extract frames:
      - Baseline: `ffmpeg -i /tmp/input.mp4 -vf fps=1/5,scale=1280:-2 -q:v 2 /tmp/frames-%04d.jpg`
      - Optional scene change: `-vf "select='gt(scene,0.3)',scale=1280:-2", -vsync vfr`
    - Upload frames to `thumbcap-frames` bucket:
      - Naming: `frames/{videoId}/frame-0001.jpg` … `frame-XXXX.jpg`
      - Return `frameUris[]` and write Firestore doc: `workflowRuns` and `thumbnails` candidates stub.
    - Update status:
      - Write `videos/{videoId}.status="extracting"` and progress counts to `workflowRuns`.
    - Error handling:
      - Enforce size and duration limits; timeout long jobs; respond with actionable error messages.
    - Unit tests:
      - Validate command assembly for fps/scale options; test GCS path building and Firestore updates.

  - [ ] 4.2 Editor Save Service (Cloud Run)
    - Implement `POST /save` with payload:
      - `videoId: string`, `imageBase64: string` (PNG), optional `overlays: {text, position, color, font}[]`.
    - Validate input:
      - Ensure PNG format, max size (≤10MB), allowed overlays, and safe colors/contrast (basic checks).
    - Save final PNG to `thumbcap-final`:
      - Path: `final/{videoId}/final-{timestamp}.png`
    - Update Firestore:
      - `thumbnails` doc for the final asset with `finalUri`, `edited=true`, `editorMeta`.
      - `videos/{videoId}.status="ready_to_publish"` when both thumbnails and captions exist.
    - Return:
      - `finalUri` and simple checksum/hash for cache validation.
    - Unit tests:
      - Validate image parsing, size checks, GCS write, and Firestore updates.

  - [ ] 4.3 Publisher Service (Cloud Run + YouTube Data API v3)
    - Endpoints and flow:
      - `GET /oauth/init` → Redirect user to Google consent with scopes: `youtube.upload`, `youtube`.
      - `GET /oauth/callback` → Exchange code for tokens; store securely (Secret Manager or encrypted Firestore doc with 30-day retention).
      - `POST /publish` with payload:
        - `videoId: string` (internal), `youtubeVideoId?: string` (existing video), `title?: string`, `description?: string`, `thumbnailUri: string`, `captionText?: string`, `mode: "update" | "new"`
      - For `mode="update"`:
        - Use `youtube.videos.update` to set `title`/`description`.
        - Use `youtube.thumbnails.set` to upload thumbnail bytes from GCS.
      - For `mode="new"` (optional for hackathon if time allows):
        - Use `youtube.videos.insert` to upload video and set metadata; then set thumbnail.
    - Secrets and tokens:
      - Load OAuth client ID/secret from Secret Manager.
      - Encrypt and store refresh tokens with TTL of 30 days; rotate on failure.
    - Status updates:
      - Write `videos/{videoId}.status="published"` on success; Firestore log with timestamps and YouTube response IDs.
    - Error handling:
      - Handle token expiration/refresh, quota errors, invalid video IDs, large thumbnails.
      - Provide human-readable messages for the UI and `workflowRuns`.
    - Unit tests:
      - Mock OAuth flow; test `publish` update path; validate error branches and Firestore writes.

  - [ ] 4.4 Common Libraries
    - Implement `services/common/firestore.ts`:
      - Admin init; helpers: `setVideoStatus(videoId, status)`, `addWorkflowRun(run)`, `saveThumbnailMeta(variant)`, `saveCaption(caption)`.
    - Implement `services/common/gcs.ts`:
      - Helpers: `getReadStream(uri)`, `uploadBuffer(bucketPath, buffer, contentType)`, `buildPath(kind, videoId, name)`.
    - Implement `services/common/secrets.ts`:
      - Helpers: `getSecret(name)`, `setSecret(name, value)`, typed wrappers for OAuth credentials.

  - [ ] 4.5 Dockerization and Cloud Run Deployment
    - Frame extractor Dockerfile:
      - Base: `node:20-bullseye` + `apt-get install -y ffmpeg`; copy app; `CMD ["node","dist/index.js"]`
    - Editor save Dockerfile:
      - Base: `node:20-bullseye`; optimized image handling libs only if required.
    - Publisher Dockerfile:
      - Base: `node:20-bullseye`; include `googleapis` client library.
    - Deploy services:
      - `scripts/deploy-services.sh` to build/push images, deploy to Cloud Run with:
        - `--service-account`, `--max-instances`, `--concurrency`, `--memory`, `--cpu`, `--timeout`
        - Env vars: bucket names, Firestore project ID, OAuth secret names, limits (e.g., max styles)
      - Bind IAM: `roles/run.invoker` for `sa-workflows` and frontend if needed.

  - [ ] 4.6 Security & IAM Bindings
    - Service-level IAM:
      - `sa-frame-extractor`: `roles/storage.objectAdmin`, `roles/firestore.user`
      - `sa-editor`: `roles/storage.objectAdmin`, `roles/firestore.user`
      - `sa-publisher`: `roles/secretmanager.secretAccessor`, `roles/firestore.user`
    - API exposure:
      - Restrict endpoints to internal callers via IAM or signed tokens; only `publisher` OAuth init/callback is public.
    - Input validation:
      - Enforce schemas; sanitize filenames and text overlays; reject unsafe content.

  - [ ] 4.7 Observability & Metrics
    - Structured logs with `videoId`, `runId`, `service=frame/editor/publisher`.
    - Metrics: frames extracted count, save success rate, publish success rate, API latency.
    - Trace IDs carried across Workflows and service calls.

  - [ ] 4.8 Testing & Local Dev
    - Mocks: FFmpeg command runner, GCS client, Firestore, Secret Manager, and YouTube API.
    - Fixtures: sample video metadata, sample frames, sample final PNG, sample YouTube responses.
    - Run services locally with `.env` and sample payloads; verify GCS/Firestore writes.

  - [ ] 4.9 Validation Checklist
    - Frame extractor:
      - Upload sample video to `thumbcap-raw`; call `/extract`; confirm frames in `thumbcap-frames` and Firestore entries.
    - Editor save:
      - POST `/save` with base64 PNG; confirm final asset in `thumbcap-final` and status updated.
    - Publisher:
      - Complete OAuth; POST `/publish` (update mode) with existing `youtubeVideoId`; confirm thumbnail and metadata updated; Firestore reflects published status.