# What happens in this step

Once both pipelines (visual and audio/text) complete successfully and the status is “ready” (from your previous step), the user enters the review screen where they choose one thumbnail variant and one caption variant.

- The UI presents a minimum of 5 thumbnail variants, each with a predicted CTR score and a “recommended” badge on one of them (your winner from the CTR service).

- The UI presents 3 caption variants, each with metadata (scores, badges like “SEO best”, “Hook” etc) and a “copy” action so the user can pick or copy a caption.

- The user then selects one thumbnail and one caption to proceed to the next phase (editing or publishing).

## Why this step is important

- You’re giving the end-user control: automated generation has produced options, but the human picks the preferred variant.

- The entire value proposition of your system (automation + human review) hinges on this step: good UX here ensures the thumbnails/captions generated don’t feel random, and the user trusts the recommendation but has choice.

- For publishing (e.g., to YouTube Data API or other platforms), the thumbnail and caption are what the audience sees— so this is a crucial “impact” step.

## UI/UX considerations & behaviour

A. Thumbnail review UI

- Layout: grid of 5+ thumbnail images (for example 5 columns or a scrollable row)

- For each variant:
  - The thumbnail image itself (from your bucket thumbcap-thumbnails for that videoId)

  - A CTR score label (e.g., “Predicted CTR: 4.2%”)

  - If it’s the winner: a badge “Recommended” or “Best”

  - A clear selector mechanism: click/tap to choose this thumbnail (highlight selected)

- Behaviour:
  - One variant must be selected — you can default-select the “recommended” winner so user can just accept or change.

  - Possibly allow “Preview full-size” (optional) if user wants to inspect details.

  - Disable “Next” (proceed) until a thumbnail is selected.

- Accessibility: images should have alt-text; keyboard/tab navigation must allow selecting; score and badge should be readable.

B. Caption review UI

- Layout: list or card view of 3 caption options

- For each variant:
  - Caption text (short title/phrase)

  - Metadata: e.g., “SEO Score: 82”, “Readability Score: 7/10”

  - Badge: maybe “SEO Recommended”, “Hook”, “Friendly”

  - Copy button: “Copy caption” so user can copy into clipboard or use directly.

- Behaviour:
  - One caption must be chosen/accepted to proceed.

  - You can still allow user to edit the caption later (in your Edit phase) or allow override.

  - Provide “View details” or expand for longer caption if needed.

- Combined flow
  - On the review screen, show both thumbnail variants & caption variants side by side (or separate panels) so user can review both before proceeding.

  - After selection of both: “Proceed to Edit” or “Proceed to Publish” (depending on your workflow) becomes enabled.

  - If either pipeline flagged a warning (e.g., unsafe content, low CTR, poor caption score) you may surface a message: “We recommend variant #2 because it has highest predicted engagement” etc.

C. Implementation details & code considerations

- Data retrieval: The review screen component needs to fetch from your backend (via API) the list of generated thumbnail variants and caption variants for videoId. Example endpoint: GET /jobs/:videoId/variants which returns something like

```javascript
    {
        "thumbnails": [
            { "uri": ".../style1.jpg", "ctrScore": 4.2, "isWinner": false },
            { "uri": ".../style2.jpg", "ctrScore": 5.1, "isWinner": true },
            ...
        ],
        "captions": [
            { "text": "How to build X in 5 minutes", "score": 78, "type": "SEO" },
            { "text": "Build X fast & easy!", "score": 65, "type": "Hook" },
            { "text": "Easy guide to X for beginners", "score": 70, "type": "Friendly" }
        ]
    }

```

- UI state management: In your React/Remix/Vite app:
  - Maintain selectedThumbnailIndex, selectedCaptionIndex in component state (or context).

  - On mount: fetch the variants. Display loading states. Show error if variants missing.

  - On click thumbnail → set selectedThumbnailIndex; highlight. On click caption card → set selectedCaptionIndex.

  - “Next” button only active when both indices are defined.

- UX defaults: Pre-select the winner thumbnail (the one with isWinner=true) so user can accept quickly. Maybe pre-highlight the highest-scoring caption as default.

- Data submission: When user clicks “Proceed”, you call backend endpoint: POST /jobs/:videoId/selection with payload { thumbnailUri: "...", captionText: "..."} . The backend will update videos/{videoId} doc (e.g., selectedThumbnailUri, selectedCaptionText, status = "ready_to_publish").

- Navigation: After successful response, route user to /videoId/edit or /videoId/publish depending your flow.

- Edge cases:
  - If the list has fewer than minimum (e.g., only 3 thumbnails generated) — you still proceed but show message “Only 3 available”.

  - If a variant fails to load image (404) → show placeholder and disable selection or degrade gracefully.

  - On mobile: ensure thumbnail grid is scrollable and tap-targets are large enough.

## How this fits your architecture

- The thumbnail and caption generation services (from earlier step) have already written metadata (thumbnail URIs, scores; caption variants and scores) into Firestore / buckets.

- Review UI fetches that metadata.

- User interaction: selection triggers update to Firestore via your backend.

- The change in videos.status (to “ready_to_publish”) triggers UI routing to next step (Publish).

- Because you already have status-polling (in previous step), when selection is done you might stop polling and move to new page or disable further polling.
