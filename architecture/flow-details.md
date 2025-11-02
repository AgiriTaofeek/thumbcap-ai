# End-to-End Flow Details

## Upload

- UI ( app/routes/home.tsx , UploadForm ) requests signed URL and uploads to thumbcap-raw .
- CORS enabled for resumable upload; emits an object finalize event.

## Trigger

- Eventarc listens to thumbcap-raw OBJECT_FINALIZE , starts workflows/thumbcap.yaml .
- Workflow writes videos/{videoId}.status="started" and begins parallel branches.

## Parallel Pipelines (Generation)

- Frames → Vision → Imagen → CTR:
  - frame-extractor : extracts frames to thumbcap-frames , writes workflowRuns .
  - vision-analysis : scores frames (faces, color, composition), selects top frames.
  - imagen-thumbnails : generates 5 styles to thumbcap-thumbnails , writes metadata.
  - ctr-prediction : heuristic + optional Vertex Prediction; sets ctrScore and winner.

- STT → Captions → SEO:
  - captioning/stt : long-running transcription; persists base transcript.
  - captioning/gemini : generates SEO , Hook , Friendly captions; computes scores.

## Status Aggregation

- services/status-api exposes GET /status/:videoId , reading workflowRuns and videos .
- Frontend polls 3–5s to render progress ( uploading , extracting , transcribing , generating , scoring , ready , error ).

## Review

- UI ( ThumbnailReview , CaptionReview ) shows min 5 thumbnail variants with ctrScore and recommended badge, plus 3 caption variants with badges and copy action.
- User selects a thumbnail/caption to proceed.

## Edit

- UI ( EditorCanvas ) loads selected thumbnail; supports overlays, presets, color tweaks.
- Export as base64 PNG; POST /edit (editor-save service).
- Service validates input, writes final PNG to thumbcap-final , updates Firestore:
  - thumbnails doc with finalUri , edited=true ; videos.status="ready_to_publish" when captions exist.

## Publish

- UI ( PublishPanel ) handles OAuth ( /oauth/init → consent → /oauth/callback ).
- POST /publish with mode="update"| "new" , thumbnailUri , optional title / description (caption), youtubeVideoId if updating.
- publisher calls YouTube API; on success writes videos.status="published" and logs response.

## Observability & Safety

- Structured logs with videoId , runId , service ; dashboard shows TTR, error rates, publish metrics.
- Alerts for billing, error rates, latency/SLOs.
- Safety gates: Vision SafeSearch, Vertex safety configs, prompt hygiene; surfaced to UI.

## Cleanup & TTL

- GCS lifecycle deletes assets after 30 days; Firestore TTL expires docs; cost guardrails enforced.
