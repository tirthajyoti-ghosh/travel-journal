# Media Storage & Delivery — Technical Design (AWS S3)

## Purpose

Provide a **simple, reliable, long-term media storage system** for a personal travel journal app that:

* Unblocks writing immediately
* Preserves original media quality
* Avoids databases and heavy infra
* Works well for photos + videos
* Is cheap, scalable, and future-proof

This system is **write-only from the mobile app** and **read-only from the web app**.

---

## Non-Goals (Explicit)

* ❌ No metadata database
* ❌ No media upload from web app
* ❌ No video playback inside mobile app
* ❌ No folder hierarchy / nesting
* ❌ No transcoding or media processing pipeline
* ❌ No user auth / multi-user support

---

## High-Level Architecture

```
Android App
  └── (presigned upload)
        ↓
      API (minimal)
        ↓
      Amazon S3 (flat bucket)
        ↓
   CloudFront CDN
        ↓
     Public Web App
```

---

## Storage Model

### Bucket

```
s3://nomoscribe-media-prod/
```

### Object structure (flat)

All media lives in **one flat namespace**.

Examples:

```
IMG_20250321_181233.jpg
VID_20250321_181300.mp4
IMG_20250322_094455.jpg
```

### Filename rules

* Preserve **original filenames exactly**
* Images start with `IMG_`
* Videos start with `VID_`
* Chronological ordering is implied by filename

#### Collision handling (rare but necessary)

If a filename already exists:

```
IMG_20250321_181233.jpg
IMG_20250321_181233__1.jpg
IMG_20250321_181233__2.jpg
```

This is handled automatically by the API.

---

## Mobile App Responsibilities

### What the app does

* Selects media from device storage
* Reads original filename
* Requests a presigned upload URL
* Uploads file **directly to S3**
* Stores the returned object key inside the story markdown

### What the app does NOT do

* ❌ Play videos
* ❌ Store metadata
* ❌ Resize or compress media
* ❌ Authenticate users beyond a shared secret

---

## API Responsibilities (Minimal)

The API exists only to safely issue presigned URLs.

### Endpoint: `POST /media/upload-url`

**Input**

```json
{
  "filename": "IMG_20250321_181233.jpg",
  "contentType": "image/jpeg"
}
```

**Process**

1. Check if object exists in S3
2. If exists → generate suffixed filename
3. Generate presigned PUT URL
4. Return final object key + URL

**Output**

```json
{
  "objectKey": "IMG_20250321_181233.jpg",
  "uploadUrl": "https://s3-presigned-url"
}
```

### Authentication

* Static shared secret (same approach as GitHub PAT)
* Injected at runtime in the app
* Validated via request header
* Rotatable manually

No OAuth. No user system.

---

## Web App Responsibilities

### Media Rendering

* **Images**

  ```html
  <img src="https://cdn.domain/IMG_20250321_181233.jpg" />
  ```

* **Videos**

  ```html
  <video controls>
    <source src="https://cdn.domain/VID_20250321_181300.mp4" type="video/mp4" />
  </video>
  ```

### Media discovery

* Stories reference media **by object key**
* No S3 listing required for readers
* No runtime API calls needed

---

## CDN & Streaming

### CloudFront

* S3 bucket is **private**
* CloudFront is **public**
* Signed URLs optional (not required initially)
* Range requests enabled (default)

### Video streaming

* Native MP4 streaming
* Byte-range supported automatically
* No extra config required

---

## Why No Database Is Needed

* Filenames encode time
* Media is immutable
* Stories already store references
* Sorting and filtering can be done client-side
* Manual inspection/debugging stays easy

This is intentional.

---

## Cost Profile (Rough)

For a **personal travel journal**:

* Storage: cents per month initially
* Streaming: pennies unless videos go viral
* API: negligible
* CloudFront: free tier covers most usage

---

## Migration & Future-Proofing

This design allows easy future changes:

* Move to another S3 bucket
* Add thumbnails later
* Add signed URLs if needed
* Add EXIF parsing (client-side)
* Add folder prefixes later (if ever needed)

No lock-in at the data level.

---

## Final Decisions Summary

| Decision                     | Status |
| ---------------------------- | ------ |
| Flat hierarchy               | ✅      |
| Original filenames preserved | ✅      |
| No DB                        | ✅      |
| Mobile uploads only          | ✅      |
| Web streaming only           | ✅      |
| Images + videos supported    | ✅      |
| Simple auth                  | ✅      |

---

## Mental Model (Important)

Think of S3 as:

> **A dumb, eternal media drawer**
> Everything goes in
> Nothing ever changes
> Stories simply point to things inside it
