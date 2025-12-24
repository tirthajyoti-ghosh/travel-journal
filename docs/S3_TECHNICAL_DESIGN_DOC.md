# Media Storage & Delivery — Technical Design (AWS S3)

## Purpose

Provide a **simple, reliable, long-term media storage system** for a personal travel journal app that:

* Unblocks writing immediately
* Preserves original media quality
* Avoids databases and heavy infra
* Works well for photos + videos
* Is cheap, scalable, and future-proof

This system is **write-only from the mobile app** and **read-only from both the mobile app and the web app via CDN URLs**.

---

## Core Principle (Important)

> **Media becomes real the moment it is uploaded.**

* Media is uploaded immediately during writing
* A **final CloudFront CDN URL** is generated
* That URL is embedded directly into the story
* The **same URL** is used for:

  * drafts
  * editing
  * previews
  * published stories

There is no temporary or placeholder media state.

---

## Non-Goals (Explicit)

* ❌ No metadata database
* ❌ No media upload from web app
* ❌ No video playback inside mobile app
* ❌ No folder hierarchy / nesting
* ❌ No transcoding or media processing pipeline
* ❌ No user auth / multi-user support
* ❌ No gallery or bulk media management UI

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
 Mobile App (read) + Public Web App (read)
```

---

## Storage Model

### Bucket

```
s3://nomoscribe-media-prod/
```

### Object structure (environment-prefixed)

All media is organized by environment prefix to separate dev and prod files:

```
s3://nomoscribe-media-prod/
  ├── dev/
  │   ├── 2025-12-24_1735123456789_a1b2c3d4.jpg
  │   └── 2025-12-24_1735123456790_b2c3d4e5.mp4
  └── prod/
      ├── 2025-12-24_1735123456791_c3d4e5f6.jpg
      └── 2025-12-24_1735123456792_d4e5f6g7.mp4
```

**Environment Detection:**
- API automatically detects environment from `NOMOSCRIBE_ENVIRONMENT`, `VERCEL_ENV`, or `NODE_ENV`
- Development mode: uploads to `dev/` prefix
- Production mode: uploads to `prod/` prefix

**Benefits:**
- Easy cleanup of dev files (delete entire `dev/` prefix)
- S3 lifecycle policies can auto-expire dev files
- Consistent with GitHub branch strategy (dev-playground vs main)
- Single bucket and CloudFront distribution

### Filename rules

* Format: `YYYY-MM-DD_TIMESTAMP_RANDOMHEX.extension`
* Example: `2025-12-24_1735123456789_a1b2c3d4.jpg`
* 8-character random hex suffix ensures uniqueness
* Chronological ordering by filename
* Sortable and traceable

**Full S3 key format:**
```
{environment}/{date}_{timestamp}_{random}.{extension}
```

Examples:
```
dev/2025-12-24_1735123456789_a1b2c3d4.jpg
prod/2025-12-24_1735123456791_c3d4e5f6.mp4
```

Collision handling is not needed due to timestamp + random hex combination.

---

## Mobile App Responsibilities

### What the app does

* Inline media selection while writing (Expo Media Picker)
* Reads original filename from device
* Requests a presigned upload URL
* Uploads file **directly to S3**
* Receives final object key
* Computes final CDN URL
* **Embeds the CDN URL directly into the story content**
* Renders images and video thumbnails inside the editor and drafts

### What the app does NOT do

* ❌ Play videos
* ❌ Store separate media metadata
* ❌ Maintain a media gallery
* ❌ Resize or compress media
* ❌ Authenticate users beyond a shared secret

---

## Inline Media Embedding Model

Media is embedded directly into the story body.

### Image example

```md
![IMG_20250321_181233](https://cdn.domain/IMG_20250321_181233.jpg)
```

### Video example

```html
<video src="https://cdn.domain/VID_20250321_181300.mp4" preload="metadata" />
```

* Images render inline
* Videos render as thumbnails/posters
* Same rendering logic applies to drafts, edits, and published stories

The story file itself is the **single source of truth**.

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
4. Return final object key + upload URL

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

* Stories reference media **by CDN URL**
* No S3 listing required
* No runtime API calls needed for reading

---

## CDN & Streaming

### CloudFront

* S3 bucket is **private**
* CloudFront is **public**
* CloudFront serves:

  * images
  * video thumbnails
  * full videos (web only)
* Signed URLs optional (not required initially)
* Range requests enabled (default)

### Video streaming

* Native MP4 streaming
* Byte-range supported automatically
* No transcoding or manifests required

---

## Why No Database Is Needed

* Filenames encode time
* Media is immutable
* Stories already store CDN URLs
* Drafts and published content use the same references
* Manual inspection/debugging stays easy

This is intentional.

---

## Cost Profile (Rough)

For a **personal travel journal**:

* Storage: cents per month initially
* CDN delivery: pennies unless traffic spikes
* API: negligible
* CloudFront free tier covers early usage

---

## Migration & Future-Proofing

This design allows easy future changes:

* Add thumbnails later (optional)
* Add signed URLs if privacy is needed
* Add EXIF parsing (client-side)
* Introduce folder prefixes later (if ever needed)
* Move buckets or CDNs without touching story content

No lock-in at the data level.

---

## Final Decisions Summary

| Decision                              | Status |
| ------------------------------------- | ------ |
| Flat hierarchy                        | ✅      |
| Original filenames preserved          | ✅      |
| No DB                                 | ✅      |
| Inline uploads while writing          | ✅      |
| CDN URL embedded immediately          | ✅      |
| Same URL for drafts & published       | ✅      |
| Mobile shows images & thumbnails only | ✅      |
| Web streams full videos               | ✅      |
| Simple shared-secret auth             | ✅      |

---

## Mental Model (Important)

Think of S3 as:

> **A dumb, eternal media drawer**
> Everything goes in
> Nothing ever changes
> Stories simply embed URLs that point to it
