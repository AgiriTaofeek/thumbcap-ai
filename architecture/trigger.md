# Trigger

## What’s happening conceptually

When a file (i.e., video) is fully uploaded to the bucket thumbcap-raw, you don’t want to rely on the frontend or the user to manually tell your system “upload is done” and start the pipeline. Instead you use an event-driven mechanism so that once the object is created in the bucket, your orchestration automatically fires.

That means:

- Monitor the bucket for the “object finalize” event (i.e., a new file has been created/complete)
- When that event happens, trigger the workflow defined in workflows/thumbcap.yaml
- The workflow begins: writes a document in Firestore to mark videos/{videoId}.status = "started", then kicks off your parallel pipelines (frames → vision branch, and STT/text branch)
- The user (frontend) sees the status moving from “uploading” to “started” then onward.

## How to implement it with Google Cloud services

Here’s how you do it on the GCP side (with reference to your toolset):

## Enable the right APIs & permissions

Make sure you have these enabled:

- Google Cloud Workflows API

- Google Cloud Eventarc API

- Google Cloud Storage API
  You also need a service account with the invoker role for the workflow, and permissions for Eventarc to trigger the workflow. The documentation covers this.

## Create an Eventarc trigger for object-finalize

You create a trigger that says: “Whenever there is an event of type google.cloud.storage.object.v1.finalized in bucket thumbcap-raw, then start the workflow thumbcap.yaml with the event data as input.”

From docs:

```
"An Eventarc trigger declares your interest in a certain event or set of events … you can configure event routing so that an execution of your workflow is triggered in response to a direct Cloud Storage event."
```

The trigger filters:

- event type = google.cloud.storage.object.v1.finalized (object creation)

- bucket = thumbcap-raw (your bucket)

- optionally path filter like prefix/suffix if you want only certain uploads
  And the destination is your Workflows workflow.

## Workflow begins execution with event payload

Once the event happens (i.e., upload completes), Eventarc delivers the event to the Workflows service. The workflow receives the event as runtime argument (it includes metadata like bucket name, object name, generation, etc.).

Inside your workflow (thumbcap.yaml):

- Step 1: write to Firestore collection videos/{videoId} status = “started” (you’ll extract videoId from the object name or metadata)
- Step 2: fork two branches (parallel): one for the visual pipeline (frames → vision → imagen → ctr) and one for the audio/text pipeline (stt → captions → seo)
- The workflow will monitor both branches’ statuses, wait for them or handle errors, then finalize by writing status = “ready” (once both succeed) or “error” if any fails.

## Frontend and status API pick up changes

Because you wrote the status to Firestore at the start (“started”) and later when ready, your status-API service (GET /status/:videoId) can read the Firestore document and report the correct status to the UI. The UI is polling and shows progress to the user.

## Mapping back into your architecture

Let’s align this with your described architecture so it’s crystal clear:

- Bucket: thumbcap-raw — when upload finalizes, triggers event.

- Eventarc trigger watches that bucket for “object finalize” event.

- Trigger target: the workflow defined in workflows/thumbcap.yaml.

- Workflow writes in Firestore: collection videos, doc {videoId}, field status = "started".

- Workflow then begins two parallel branches:
  - Visual branch: frame-extract → vision-analysis → imagen-thumbnails → ctr-prediction

  - Text/audio branch: captioning/stt → captioning/gemini (SEO/captions)

- Once both branches succeed → workflow writes videos/{videoId}.status = "ready".

- UI polls /status/:videoId and sees “ready” → shows review step.

## Some extra tips & pitfalls

- VideoId extraction: Ensure the object name includes a unique videoId (perhaps as folder or filename) so the workflow knows which Firestore doc to update.

- Idempotency: The object finalise event may fire more than once or be retried. Make sure your workflow or initial status write handles duplicates gracefully (e.g., if status already “started”, don’t duplicate work). Note: duplicates are a known Eventarc behaviour.

- Filtering: If your bucket gets many uploads not related to this workflow, you might want to filter by path prefix or suffix (e.g., “videos/uploads/”). Some limitations: filtering by filename pattern for workflows isn’t always easy.

- Permissions: Make sure the service account used by Eventarc trigger has roles/workflows.invoker and related permissions. Also Cloud Storage service agent needs pubsub.publisher etc.

- Workflow error handling: Define a path for errors—update Firestore status to “error” with message, allow retry.

- Observability: Log the fact that workflow started, branch statuses, timestamps. Use these logs for your dashboards.
