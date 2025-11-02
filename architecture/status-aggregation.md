# Status Aggregation

After the upload triggers and parallel pipelines (visual and audio/text) run, you want a single unified view of where the video job stands. This is what the status-API service provides. In your architecture:

- The service status‑api exposes an endpoint: GET /status/:videoId.
- It reads data from two sources:
  - The videos collection in Firestore (which has the primary job document for the video, with fields like status, videoId, etc).
  - The workflowRuns collection (or whichever collection you are populating for each step of the pipelines) which has records of each pipeline step (frame extraction run, vision analysis run, captioning run, etc).
- Based on those reads, it aggregates a meaningful status value (e.g., “uploading”, “extracting”, “transcribing”, “generating”, “scoring”, “ready”, “error”) and returns it to the frontend.
- The frontend polls this endpoint every ~3-5 seconds so the user sees the progress of the job.

## Why this is important

- User experience: The user (on your UI) needs feedback — “we’re working on your video”, “frames extracted”, “captions generated”, etc. Without this, the UI would sit idle.
- Decoupling: Each pipeline runs asynchronously and independently; your status-API is the glue that hides the complexity and presents a single coherent state.
- Monitoring & error handling: You can detect early failures (e.g., if one pipeline fails and you set status = error) and surface them to the user.
- Scalability & visibility: Your architecture allows many videos/jobs in parallel; status-API must scale, read from Firestore efficiently, and handle many poll requests.

## How to implement this step in your code / architecture

Here’s a breakdown of the implementation, the data flows, and what to code.

A. Data sources & schema

- Firestore collection: videos
  - Document key: videoId

  - Fields might include: status, uploadTimestamp, readyTimestamp, errorMessage (if any), winnerThumbnailUri, etc

- Firestore collection: workflowRuns
  - Documents: each time a step runs (frame extraction, vision analysis, captioning, thumbnail generation, prediction) you write a run record. Fields: videoId, stepName, runId, status, startTime, endTime, maybe resultUri, score, errorMessage

- (Optionally, you might also have thumbnails collection, captions collection, etc but for status-API these two suffice)

B. Status-api endpoint GET /status/:videoId

- Implementation steps:
  - Receive videoId from path param.
  - Query Firestore: fetch videos/{videoId} document. If not found → return 404 or “not found” status.
  - Query workflowRuns for that videoId (either all runs or perhaps runs with recent timestamps).
  - Based on the data, derive a normalized state (one of your statuses: uploading → extracting → transcribing → generating → scoring → ready → error).
    - Example logic:
      - If videos.status == “error” → return status = “error”.
      - Else if videos.status == “published” (or “ready_to_publish” depending) → return status = “ready” (or “published”).
      - Else if workflowRuns show frame extraction is still running → status = “extracting”.
      - Else if workflowRuns show transcript not yet completed → status = “transcribing”.
      - Else if thumbnail generation etc still ongoing → status = “generating”.
      - Else if prediction done → status = “scoring”.
      - Else default: “uploading” (or “started”).
  - Ensure the response is fast (cached if necessary) because the frontend is polling every few seconds.
  - Return a JSON object containing something like:

        ```javascript
        {
        "videoId": "abc123",
        "status": "generating",
        "details": {
            "frameExtraction": { "status": "completed", ... },
            "visionAnalysis": { "status": "inProgress", ... },
            "captioning": { "status": "completed", ... },
            "thumbnailGeneration": { "status": "inProgress", ... }
        },
        "lastUpdated": "2025-11-01T12:34:56Z"
        }
        ```

## Frontend polling logic

- In your UI (in ProgressBar component or where you manage polling):
  - Initiate polling every 3-5 seconds (you said “polls 3–5 s”).

    ```javascript
    setInterval(async () => {
      const res = await fetch(`/status/${videoId}`);
      const data = await res.json();
      updateUIWithStatus(data.status, data.details);
      if (data.status === "ready" || data.status === "error") {
        clearInterval(timer);
      }
    }, 3000);
    ```

  - On each poll: update the UI (progress bar, text message) based on status. Map statuses to UI text: - "uploading" → “Uploading your video…”

        - "extracting" → “Extracting frames…”

        - "transcribing" → “Transcribing audio…”

        - "generating" → “Generating thumbnails & captions…”

        - "scoring" → “Scoring thumbnail variants…”

        - "ready" → “Ready for review” (then navigate to review screen)

        - "error" → Show error message and retry option

- Handle edge cases:
  - If polling fails (network error) → show “Something went wrong, retrying…”

  - If polling shows status for too long (e.g., > X minutes) → show timeout message or escalate.

  - If user reloads page, you can read localStorage to get videoId and continue polling.

## Performance / scaling considerations

- Since polling every 3-5 seconds means many requests (especially if many users/jobs), your status-API must be optimized:
  - Use Firestore lookups by videoId (single document fetch) + maybe cached run-state summary instead of many queries.

  - Consider using Cloud Run or other scalable service with concurrency tuned.

  - Possibly leverage caching (e.g., Cloud CDN or in-memory) for “status” responses for video jobs in certain “steady” states.

- Polling interval: 3–5 s is reasonable for user experience, but if you scale to many users you might consider adaptive interval (longer when status remains unchanged for X polls) to reduce load. The concept of polling overhead is well-documented.

- Resource usage: each poll is a HTTP GET + DB reads — keep it lightweight.

## Status progression and consistency

- Ensure the statuses you return are consistent and meaningful for the user and UI. You already defined them in your flow:

  ```arduino
    uploading → extracting → transcribing → generating → scoring → ready → ready_to_publish → published
  ```

- Ensure your services update the videos.status field or write to workflowRuns in a timely manner when they start/complete so status-API can detect the transitions.

- Avoid race conditions: e.g., the UI might poll just as the workflow writes “ready”. Make sure your status extraction logic handles intermediate states (like “inProgress”) cleanly.

## Error states

- If any pipeline step fails (frame extraction error, vision analysis error, captioning error etc), your workflow should write into videos.status = "error" (or maybe “failed”).

- Status-API sees status = “error” and returns it. UI should show a friendly error and maybe “Retry” option.

- Possibly include errorMessage in API response so UI can show “Failed at vision analysis: unsafe content detected”.

## Summary mapped back to your architecture

- Upload → Eventarc → Workflow begins writing videos.status = "started".

- Parallel pipelines run and update workflowRuns.

- Status-API reads from Firestore (videos, workflowRuns) and returns a consolidated status.

- Frontend polls every 3–5 s on GET /status/:videoId and updates the UI accordingly.

- Once status “ready” (or “error”), UI transitions to next screen (review or error).

- This gives your user a smooth experience of “uploading → processing → ready” and gives you telemetry on pipeline state.
