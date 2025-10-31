## Relevant Files

- `services/common/logging.ts` - Structured JSON logger with correlation fields (`videoId`, `runId`, `service`).
- `services/common/metrics.ts` - Helpers to emit log-based metrics and custom counters.
- `workflows/thumbcap.yaml` - Attach labels, status updates, retries, and centralized error handling.
- `services/status-api/src/index.ts` - Aggregates statuses with normalized state mapping and error messages.
- `infra/logging-config.md` - Log-based metrics definitions (TTR, error rates), and Cloud Monitoring dashboard steps.
- `infra/alerts.md` - Alert policies for billing, error rate, SLO breach, and latency thresholds.
- `infra/budget-alerts.md` - Billing budget, thresholds (daily $50), and notification routing (email/Slack).
- `infra/safety-policies.md` - SafeSearch thresholds, Vertex safety configs, and prompt hygiene rules.
- `infra/lifecycle-ttl.md` - GCS lifecycle (30-day deletion), Firestore TTL field policy.
- `scripts/setup-alerts.sh` - Script to create Monitoring alert policies (optional helper).
- `scripts/labels.sh` - Apply resource labels (`project=thumbcap`, `env=hackathon`) for traceability.

### Notes

- Use structured JSON logs across services for consistent ingestion in Cloud Logging.
- Prefer log-based metrics for TTR and error rates during hackathon; dashboards are fast to configure.
- Propagate `videoId` and `runId` through Workflows and service requests for correlation.
- Safety gates should block early and return actionable messages for UX polish.
- Keep guardrails simple but explicit: generation limits, backoff policies, lifecycle cleanup.

## Tasks

- [ ] 6.0 Observability, Safety, Cost & Performance Guardrails

  - [ ] 6.1 Structured Logging & Correlation
    - Implement `services/common/logging.ts`:
      - JSON logger with fields: `timestamp`, `level`, `service`, `videoId`, `runId`, `msg`, `meta`.
      - Provide helpers: `logInfo()`, `logWarn()`, `logError()`, `logMetric(name, value, labels)`.
    - Ensure all services (frame-extractor, vision-analysis, imagen, captioning, ctr, editor-save, publisher, status-api) use the logger.
    - Propagate `videoId` and `runId` from Workflows to each service call and include in logs.

  - [ ] 6.2 Log-Based Metrics & Dashboard
    - Define metrics:
      - Time-to-first-result (TTR): upload finalize → first thumbnail/caption generated.
      - Generation error rate: errors per service per run.
      - Publish success rate and latency.
    - Configure log-based metrics in Cloud Monitoring:
      - Filters for `service=imagen` and `msg=generated` to compute counts and latency.
      - Filters for `level=error` grouped by `service`.
    - Create a dashboard with charts for TTR, error rate, and publish success.

  - [ ] 6.3 Tracing & Request IDs
    - Propagate `X-Cloud-Trace-Context` header across Workflows → Cloud Run services.
    - Include `traceId` in logs when available; fall back to generated request IDs per call.
    - Validate trace continuity in Cloud Trace for a sample end-to-end run.

  - [ ] 6.4 Alert Policies
    - Billing Alert:
      - Set daily budget of $50; notifications via email for hackathon.
    - Error Rate Alerts:
      - Trigger alert when `error rate > 5%` over 10 minutes for any service.
    - Latency/SLO Alerts:
      - Alert when `TTR > 5 minutes` for a 10–20 min video, or publish latency exceeds 60 seconds.
    - Document alert configuration in `infra/alerts.md`; optionally automate with `scripts/setup-alerts.sh`.

  - [ ] 6.5 Safety Controls (Content & Prompt Hygiene)
    - Vision SafeSearch:
      - Gate frames before Imagen; block `adult/violence` likelihood above `LIKELY`.
      - Log safety decisions with reasons; write to Firestore (`workflowRuns`).
    - Vertex Safety:
      - Enable model safety settings for Imagen and Gemini; restrict unsafe content generation.
    - Prompt Hygiene:
      - Use approved prompt templates only; sanitize user text overlays; escape special characters.
    - UX Integration:
      - Surface clear, friendly safety messages in the UI (e.g., “This frame looks unsafe—try another”).

  - [ ] 6.6 Cost Guardrails
    - Limit Imagen to 5 styles per video.
    - Bound Gemini tokens and model parameters to cost-effective defaults.
    - Implement exponential backoff and request throttling for Vertex and Vision calls.
    - GCS Lifecycle:
      - 30-day deletion rules for `thumbcap-raw`, `thumbcap-frames`, `thumbcap-thumbnails`, `thumbcap-final`.
    - Firestore TTL:
      - Add `expiresAt` field on documents and enable TTL policy.
    - Document guardrails in `infra/lifecycle-ttl.md` and PRD alignment.

  - [ ] 6.7 Performance Guardrails
    - Cloud Run scaling:
      - Set `--max-instances` and `--concurrency` for each service to manage throughput (target: 100 concurrent videos).
    - FFmpeg performance:
      - Prefer streaming; adjust `-threads` and `-preset` for balanced speed.
    - Batch Vision calls to reduce round trips; parallelize Imagen requests where safe.
    - Use Workflows parallel branches with joins; add backpressure via Eventarc/Pub/Sub if needed.

  - [ ] 6.8 Status & Error UX Integration
    - Normalize statuses in `services/status-api`:
      - `uploading`, `extracting`, `transcribing`, `generating`, `scoring`, `ready`, `error`.
    - Error mapping:
      - Map service errors to user-friendly messages and remediation tips.
    - Firestore logging:
      - Write `workflowRuns` entries per step with status, timestamps, and error summaries.

  - [ ] 6.9 Validation Checklist
    - Run a sample end-to-end and confirm:
      - Logs include `videoId` and `runId` across services; traces visible in Cloud Trace.
      - Dashboard shows TTR, error rates, and publish metrics.
      - Alerts trigger under simulated error/latency conditions.
      - Safety gates correctly block unsafe frames and return actionable messages.
      - Lifecycle deletion and TTL policies work for test artifacts.