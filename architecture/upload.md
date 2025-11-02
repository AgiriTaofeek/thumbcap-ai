# Upload

## 1. Requesting a signed URL

- Your frontend (in app/routes/home.tsx, the UploadForm component) sends a request to your backend (or an API endpoint you host) asking for a signed URL for uploading.
- A signed URL (for Google Cloud Storage) is a link that grants limited-time permission to upload a specific object to a bucket, without requiring full credentials.
  Google Cloud
- For example, you may call something like POST /api/getUploadUrl?videoId=xyz → backend returns a signed URL that allows a PUT or POST to gs://thumbcap-raw/.../videoId.

## 2. Uploading directly from browser to GCS (bucket thumbcap-raw)

- Once the frontend gets that signed URL, it uses it to upload the video file directly to the bucket. This avoids having to stream the large video via your backend service.
- Because it's a browser → cloud-storage upload crossing domain/origin boundaries (your web app origin → storage.googleapis.com or similar), you must ensure CORS (Cross-Origin Resource Sharing) is properly configured on the bucket.
- You also plan to use resumable upload, which means the upload is chunked (so large file failures can resume rather than start over).

## 3. CORS for resumable upload

- This is one of the trickier bits: When you upload directly from the browser using a signed URL + resumable upload, you’ll have to configure the bucket’s CORS rules so that the browser is allowed to send the upload, and get back responses with the correct CORS headers.

- For example, the bucket’s CORS configuration (via gcloud storage buckets update --cors-file=...) might look like:

```
[
  {
    "origin": ["https://your-app.domain.com"],
    "method": ["PUT","POST"],
    "responseHeader": ["Content-Type","x-goog-resumable","*"],
    "maxAgeSeconds": 3600
  }
]
```

- If the upload works (the video appears in the bucket) but you see CORS errors in the browser console (e.g., “No ‘Access-Control-Allow-Origin’ header”), that usually means the bucket’s CORS rules don’t allow the request origin / method / headers exactly as the browser is using.

- Important: Resumable uploads involve more than just a single PUT — there is an initiation step (POST with uploadType=resumable or x-goog-resumable:start) which returns a session URI, then subsequent PUTs to that URI for chunks. The CORS response headers must work for the actual upload endpoint too.

## 4. GCS bucket event emission (Object Finalize)

- After the upload completes, your bucket thumbcap-raw will emit a cloud storage event (e.g., OBJECT_FINALIZE) which triggers your orchestration workflow (via Google Cloud Workflows or Google Cloud Eventarc). This signals the start of your pipeline.

- So the frontend doesn’t manually call the workflow — rather, once the file is in thumbcap-raw, the event triggers the next steps.

## 5. Why it feels confusing and how to simplify your mental model

Because there are multiple systems interacting (frontend, your backend issuing signed URL, cloud storage, CORS, event triggers, workflow orchestration) — it can feel like a lot.

To simplify:

- Frontend asks backend: “Give me permission to upload to bucket X for videoId Y.”
- Backend generates a signed URL (upload endpoint) and returns it to the frontend.
- Frontend uses that URL (with correct headers, CORS, possibly chunked upload) to send the file to the bucket thumbcap-raw.
- The bucket receives the object, emits a finalize event → your workflow kicks off.
- Meanwhile, in Firestore you may create a videos/{videoId} doc with .status = “uploading” or similar so you show progress in the UI.

## 6. What you should check / implement to make this smooth

- Ensure the bucket thumbcap-raw has correct CORS configuration so uploads from your web app origin succeed (including the resumable upload flow). Use the doc: “Set up and view CORS configurations”
- The signed URL generation logic must allow resumable uploads (so set action='resumable' or similar in your library) if you want chunk/resume. The doc for resumable uploads explains this.
  Google Cloud
- On the frontend, you’ll trigger upload once the URL is received. Track upload progress (via XMLHttpRequest.upload.onprogress or fetch/chunk logic) and optionally update the UI with “uploading … %”.
- After upload completes, update Firestore (or your backend) so your UI sees status = “uploadingComplete” or such, and then start polling /status/:videoId (as you described) to catch when the next pipeline stage begins.
- Consider error/warning handling: what if upload fails? what if the signed URL expires? what if resumable session is lost?
