## Relevant Files

- `workflows/thumbcap.yaml` - Cloud Workflows orchestration skeleton and steps.
- `infra/gcs-buckets.md` - Bucket structure, naming, CORS, and lifecycle (30-day retention).
- `infra/eventarc.md` - Eventarc trigger from GCS finalize to Workflows.
- `infra/iam-roles.md` - IAM bindings for Workflows and Eventarc trigger service accounts.
- `infra/env.example.json` - Orchestration config: bucket names, regions, topics, endpoint URLs.
- `services/status-api/src/index.ts` - Cloud Run service to aggregate workflow status from Firestore.
- `services/common/firestore.ts` - Firestore Admin init used by status API and backend services.
- `services/common/types.ts` - Shared types for `videos`, `thumbnails`, `captions`, `workflowRuns`.
- `scripts/workflows-deploy.sh` - Helper script to deploy/update the workflow.
- `scripts/storage-setup.sh` - Helper script to create buckets, CORS, and lifecycle rules.
- `scripts/eventarc-setup.sh` - Helper script to create Eventarc trigger to start the workflow.

### Notes

- Prefer Eventarc to trigger Workflows directly on GCS `OBJECT_FINALIZE` events (no intermediary service needed).
- Use labels (`project=thumbcap`, `env=hackathon`) on buckets and services for traceability.
- CORS needed for signed uploads from the frontend: allow `PUT`, `POST`, `GET`, with limited origins.
- Firestore TTL can expire documents via a designated timestamp field; use GCS lifecycle for binary assets.

## Tasks

- [ ] 2.0 Orchestration & Storage Setup
  - [ ] 2.1 Define Bucket Structure and Policies
    - Create buckets: `thumbcap-raw`, `thumbcap-frames`, `thumbcap-thumbnails`, `thumbcap-final`.
    - Enable uniform bucket-level access; add lifecycle to auto-delete after 30 days.
    - Set CORS on `thumbcap-raw` for resumable uploads from the frontend domain.
    - Add project-level labels on buckets for traceability.
  - [ ] 2.2 Configure Event Trigger From GCS to Workflows
    - Enable Eventarc; verify `workflows.googleapis.com` and `eventarc.googleapis.com` are on.
    - Create an Eventarc trigger listening to GCS `google.cloud.storage.object.v1.finalized` events in `thumbcap-raw`.
    - Bind the trigger to start `workflows/thumbcap` with the object metadata payload (bucket, name, size, contentType).
    - Ensure the trigger runtime identity has `roles/workflows.invoker` and read permissions on buckets if required.
  - [ ] 2.3 Author Cloud Workflows Definition (`workflows/thumbcap.yaml`)
    - Define `init` step: write a `videos/{videoId}` doc with `status="started"`.
    - Parallel branch: `frames` → `vision` → `imagen` → `ctr` pipeline.
      - `frames`: call Cloud Run `frame-extractor` with GCS URI; write `frames` metadata.
      - `vision`: score frames via Vision API; select top 4; write to Firestore.
      - `imagen`: generate 5 styles from selected frames via Vertex Imagen; persist to GCS + Firestore.
      - `ctr`: compute heuristic CTR + optional Vertex Prediction; set recommended winner.
    - Parallel branch: `stt` → `captions` → `seo` pipeline.
      - `stt`: long-running Speech-to-Text; store transcript.
      - `captions`: generate 3 variants via Gemini (SEO, Hook, Friendly); save to Firestore.
      - `seo`: compute SEO/engagement scores; update caption docs.
    - `finalize` step: set `videos/{videoId}.status="ready"`; write run summary; handle errors centrally.
    - Add retries/backoff on transient errors; attach labels (`videoId`, `runId`) to calls.
  - [ ] 2.4 Firestore Schemas and Indexes
    - Collections: `videos`, `thumbnails`, `captions`, `workflowRuns`.
    - Define required fields and indexes (e.g., `videos.status`, `thumbnails.videoId+ctrScore`, `workflowRuns.videoId+step`).
    - Establish TTL field for document cleanup (e.g., `expiresAt` + policy).
  - [ ] 2.5 Status Aggregation API (Cloud Run)
    - Implement `GET /status/:videoId` to aggregate step statuses from Firestore (`workflowRuns`, `videos`).
    - Return normalized states: `uploading`, `extracting`, `transcribing`, `generating`, `scoring`, `ready`, `error`.
    - Authenticate internal calls via IAM (`roles/run.invoker`) and allow frontend via token/session.
  - [ ] 2.6 Environment and Config Wiring
    - Create `infra/env.example.json` with `projectId`, `region`, bucket names, and endpoint base URLs.
    - Ensure Workflows config references endpoints and bucket names via environment variables/parameters.
    - Document `.env` consumption by status API and backend services.
  - [ ] 2.7 Deployment Scripts and Validation
    - Write `scripts/storage-setup.sh` to provision buckets, set CORS, lifecycle rules.
    - Write `scripts/eventarc-setup.sh` to create the Eventarc trigger.
    - Write `scripts/workflows-deploy.sh` to deploy/update `workflows/thumbcap.yaml`.
    - Validate: upload a sample video to `thumbcap-raw` and confirm Workflow starts; check Firestore status updates.
  - [ ] 2.8 Security & IAM Bindings for Orchestration
    - Ensure `sa-workflows` has `roles/workflows.invoker`, `roles/run.invoker`, `roles/firestore.user`, and limited Storage access.
    - Ensure Eventarc trigger service identity has `roles/eventarc.eventReceiver` and can invoke the workflow.
    - Restrict `status-api` to read-only Firestore operations, plus `roles/run.invoker` for trusted callers.
  - [ ] 2.9 Error Handling & Backpressure
    - Implement exponential backoff in workflow steps for Cloud Run and Vertex API calls.
    - Add circuit-breaker behavior: mark `videos.status="error"` with human-readable message and remediation tips.
    - Design simple re-run mechanism: allow restarting failed steps via a parameterized workflow execution.
