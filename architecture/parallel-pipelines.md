# Parallel Pipelines (Generation)

Let’s dive into the Parallel Pipelines (Generation) step and detail how you can model it in your architecture (especially the orchestration using Google Cloud Workflows) and how each service fits. I'll walk you through it in sequential phases: what each pipeline does, how it fits in the workflow, how you manage parallelism

## What the two pipelines do

You have two major “branches” of work (both triggered once the upload & trigger step is done):

A. Visual Pipeline (“Frames → Vision → Imagen → CTR”)

- frame‑extractor: This service extracts frames from the uploaded video in thumbcap-raw, writes frames into the GCS bucket thumbcap-frames, and writes a record in Firestore collection workflowRuns (or whatever you named it) capturing metadata (videoId, runId, frameUris, timestamp).
- vision‑analysis: Reads extracted frames, runs vision analysis (face detection, color/composition scoring, maybe safe search, etc), then selects the top frames (say top N by score) for thumbnail generation. It writes results (frameUri + score) to Firestore or metadata tables.
- imagen‑thumbnails: Takes selected frames and generate several thumbnail styles (in your case 5 styles) and writes them into the bucket thumbcap-thumbnails, and writes metadata (style, uri, timestamp) to Firestore (e.g., thumbnails collection).
- ctr‑prediction: Uses heuristics (and optionally an ML model via Vertex AI) to assign a “click-through-rate” (CTR) score for each thumbnail variant, selects a “winner” thumbnail (highest predicted CTR) and writes this into Firestore under thumbnails or the video record (e.g., winnerThumbnailUri, ctrScore).

B. Audio/Text Pipeline (“STT → Captions → SEO”)

- captioning/stt: Transcribes the audio of the video (from thumbcap-raw or maybe an extracted audio track) into a base transcript. Writes the transcript (segments) into Firestore (captions collection) or maybe a storage object and metadata.
- captioning/gemini: Takes the transcript and generates multiple caption variants (SEO caption, “hook” caption, friendly caption). Computes scores (maybe SEO score, readability, etc). Writes 3 caption variants + metadata (score, type) into Firestore.

## How to represent this in the workflow

In your workflow definition (workflows/thumbcap.yaml), you’ll model two parallel branches (one for visual, one for audio/text). According to the Google Workflows docs, you can use a parallel step with branches to achieve this.

Here’s a simplified sketch in YAML form (you’d replace the service call steps with your actual Cloud Run endpoints):

```yaml
main:
  params: [args]
  steps:
    - init:
        # e.g., assign videoId = args.videoId, bucket = args.bucketName
        assign:
          - videoId: ${args.videoId}
          - bucket: ${args.bucketName}
        # Write status "started" in Firestore videos/{videoId}
    - writeStatusStarted:
        call: http.post
        args:
          url: ${statusApiUrl + "/videos/" + videoId + "/status"}
          body:
            status: "started"
    - parallelPipelines:
        parallel:
          shared: [videoId]
          branches:
            - visualPipeline:
                steps:
                  - extractFrames:
                      call: http.post
                      args:
                        url: frameExtractorUrl
                        body:
                          videoId: ${videoId}
                          bucket: ${bucket}
                          outputPrefix: "frames/" + videoId
                  - visionAnalysis:
                      call: http.post
                      args:
                        url: visionAnalysisUrl
                        body:
                          videoId: ${videoId}
                  - generateThumbnails:
                      call: http.post
                      args:
                        url: imagenThumbnailsUrl
                        body:
                          videoId: ${videoId}
                          styles: ["style1","style2","style3","style4","style5"]
                  - ctrPrediction:
                      call: http.post
                      args:
                        url: ctrPredictionUrl
                        body:
                          videoId: ${videoId}
            - textPipeline:
                steps:
                  - transcribe:
                      call: http.post
                      args:
                        url: sttUrl
                        body:
                          videoId: ${videoId}
                  - generateCaptions:
                      call: http.post
                      args:
                        url: captioningGeminiUrl
                        body:
                          videoId: ${videoId}
    - finalize:
        # write status "ready" in Firestore when both branches succeed
        call: http.post
        args:
          url: ${statusApiUrl + "/videos/" + videoId + "/status"}
          body:
            status: "ready"
    - return:
        return: ${{"videoId": videoId, "status":"ready"}}
```

Key points:

- The parallel construct allows both branches to run concurrently (so your visual branch and text branch start at the same time).
- shared: [videoId] indicates the variable videoId is accessible/writable in both branches.
- You still have a synchronization point: the workflow waits for both branches to finish before running the finalize step (which writes status “ready”).
- If one branch fails, you can design error handling to write status “error” and optionally cancel the other branch or allow it, depending on policy. The docs say the parallel step waits until all defined steps complete or an unhandled exception occurs.

## Functional requirements

- For the visual pipeline:
  - The system must extract frames at a configurable frame rate (e.g., X fps) or use scene-detection.
  - Frames are stored in bucket thumbcap-frames under folder/videoId.
  - Each extraction run must create a workflowRuns record with videoId, runId, timestamp, number of frames extracted.
  - The vision-analysis service must evaluate each frame for face presence, color composition, safe-search, and assign a score. The top N frames must be selected (configurable N).
  - The thumbnail generation service must generate exactly 5 style variants (configurable) per selected frame and store in thumbcap-thumbnails with naming convention. Metadata (style, uri, frameOrigin, ts) must be stored.
  - The CTR prediction service must use heuristics and optionally ML model to compute a ctrScore for each thumbnail variant, pick a winner, store winnerUri and all scores in Firestore.

- For the audio/text pipeline:
  - The transcription (STT) service must handle long-running jobs, persist transcript segments (startTime, endTime, text) in captions collection.
  - The captions generation service must create exactly 3 variants (SEO caption, hook caption, friendly caption), compute and store scores (readability, length, SEORank), and store in captions collection.
  - The system must mark each caption variant with a badge (“recommended”, “alternate”), and enable UI to present them.

- For orchestration:
  - The workflow must start both pipelines concurrently (visual and audio/text) after status “started”.
  - The workflow must only write status “ready” when both pipelines succeed.
  - If either pipeline fails, the workflow must write status “error” with message and make that visible to the UI.
  - Shared data (videoId, runId) must propagate across branches.

## Non-functional requirements

- Concurrency / latency: By running in parallel, the generation pipelines should achieve end-to-end time (from upload finalize → ready) within a target (e.g., 5 minutes for a 10-minute video).
- Scalability: Each of the Cloud Run services must autoscale, the workflow should support many concurrent video jobs without queuing excessively.
- Observability: Each step must emit structured logs (service name, videoId, runId, status, timestamps). The workflow execution must be visible in the console so you can trace branches and step statuses.
- Retry/backoff: If a service fails (e.g., vision-analysis), the workflow must retry (configurable attempts) or escalate.
- Cost guardrails: Frame extraction should limit number of frames (configurable) to prevent unlimited compute cost. Thumbnail generation must limit style count (your 5 styles cap).
- Safety: Vision analysis must include SafeSearch filtering (if unsafe content, workflow should stop and status = error).
- Storage and cleanup: Frames, thumbnails, transcript segments older than TTL (e.g., 30 days) should be cleaned up via GCS lifecycle and Firestore TTL.

## Interface/API requirements

- Each service (frame-extractor, vision-analysis, etc) must expose HTTP endpoints (e.g., POST /extract, /analyze, /generate, /predict) with defined request/response schemas.
- Workflow must pass success/failure responses appropriately.
- Firestore schema must be defined: videos collection schema, thumbnails collection, captions collection, workflowRuns collection.

## UI requirements (for review phase, as downstream)

- The UI must poll /status/:videoId and show statuses (e.g., “Extracting frames”, “Analyzing vision”, “Generating thumbnails”, “Predicting CTR”, “Transcribing”, “Generating captions”) based on workflow progress.
- On ready, UI should show thumbnail variants with ctrScore and caption variants with badges.

## Data & event flow diagram

- Show the flow: upload → event → workflow start → parallel branches → results → status ready.
- For each branch show data movement: buckets, Firestore writes, final metadata.

## Additional tips for implementation & orchestration

- Consider using sub-workflows/child workflows for each pipeline (visual vs text) if the logic is complex or you want reuse
- Use the exception_policy property in your parallel step to define what happens if one branch fails (e.g., continueAll or stopAll). In your case you might want continueAll so you still capture what happened in the other branch, but move to error state anyway.
- Use logging/tracing: each branch step should log its own start/finish/metrics so that your observability dashboard can surface branch-level latency.
- For controlling cost: in the workflow you might first inspect video length metadata, if too long then write status “error” or split the video into smaller chunks.
- For better UX: as each step finishes (frame extract done, vision done, thumbnails generated, etc), update Firestore or workflowRuns with sub-status so UI can show more granularity.
