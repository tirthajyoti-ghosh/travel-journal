# 📘 **Travel Journal Web App + Android App — Full Design Document**

A minimal, cozy-travel-journal platform for long-term backpacking.
Stories are written from the road, stored as markdown, enriched with photos/videos, and published automatically.

---

## 1. **Vision & Goals**

### 🎯 Goal

Create a **cozy travel journal experience** where writing takes center stage and media enhances storytelling.
No pressure to write daily. No heavy tooling. Just a frictionless system to capture moments and publish beautiful stories.

### 🧭 Guiding Principles

* **Writing-first** — stories are the heart.
* **Cozy-journal aesthetic** — warm, personal, slow, intimate.
* **Minimal system** — no backend, no DB, no maintenance.
* **Offline-friendly** — drafts can be written anywhere.
* **Media-assisted** — photos/videos add flavor, not noise.
* **Your workflow must remain ultra-lightweight.**

---

## 2. **High-Level Architecture Overview**

```
Android App (Your Private CMS)
         ↓ pushes markdown files
GitHub Repo (Markdown + frontmatter)
         ↓ triggers builds
Vercel (Next.js site)
         ↓ reads markdown
Public Web App (Cozy travel journal)
```

Media stays in **Google Photos public albums** and is embedded via links.

### Components:

1. **Android App** — write/edit stories, store drafts locally, publish to GitHub.
2. **GitHub Repo** — your entire CMS; markdown files with metadata.
3. **Vercel + Next.js Web App** — renders all stories into a cozy notebook UI.
4. **Google Photos** — stores all media (images/videos).

No server, no backend, no auth complexity.

---

## 3. **Journal Aesthetic & Design Philosophy**

**Cozy-journal aesthetic** includes:

* Warm paper-like background
* Polaroid-style media embedding
* Handwritten-style headings
* Serif body font
* Soft shadows, gentle fade animations
* Notebook-like vertical timeline on homepage
* Story pages resemble a personal diary entry

All UI decisions assume this aesthetic.

---

## 4. **Technical Design**

---

### 4.1 **Data Model (Markdown Format)**

Each story is one `.md` file inside `stories/` folder:

### Frontmatter structure:

```yaml
---
title: "Slow Morning in Bangkok"
date: "2025-03-28"
location: "Bangkok, Thailand"
media:
  - "https://photos.app.goo.gl/abc123"
  - "https://photos.app.goo.gl/xyz456"
tags:
  - morning
  - rain
---
```

### Content:

Free-form markdown text — long or short.

---

### 4.2 **GitHub as CMS**

* Markdown files stored in repo
* App uses GitHub Content API to create/update files
* Fine-grained PAT (personal access token) scoped to **only this repo**
* Commit messages generated automatically
* Vercel rebuild triggered via GitHub push

---

### 4.3 **Media Storage**

* Media stored in **Google Photos public albums**
* App pastes share links into frontmatter
* Web app embeds:

  * Images in polaroid-style frames
  * Videos with soft rounded players
* Optional: link transformation helper for stable embed URLs

---

### 4.4 **Next.js / Web App Architecture**

### Structure:

```
/stories/*.md   ← static content
/app
  /page.tsx     ← homepage timeline
  /story/[slug] ← story renderer
  /about        ← optional profile page
/components     ← cozy UI components
/public         ← doodles, textures
/styles         ← fonts + global CSS
```

### Rendering:

* Build-time static generation
* Markdown → HTML using unified/remark
* Custom components for images, videos, captions
* Smooth fade-in animations

---

### 4.5 **Vercel Deployment**

* Auto-build on GitHub commit
* ISR (optional) to reduce rebuild times
* Environment variables for repo URL (optional)
* No serverless functions required

---

## 5. **Android App Design**

The app is used ONLY by you. It is your private journal-writing tool.

---

### 5.1 **Major Features**

* Create/edit stories in Markdown
* Maintain drafts offline
* Add media links (Google Photos share links)
* Auto-fill date & location
* Publish to GitHub repository via API
* Manage published + draft stories
* Offline-first architecture

---

### 5.2 **App Screens & Flows**

---

### 1. Home Screen**

Lists:

* Drafts
* Published stories

Example:

```
Draft — Rainy day in Chiang Mai
Last edited: 2 hours ago

Draft — Bus ride reflections
Last edited: Yesterday

Published — Bangkok Morning Walk
Published: Mar 28
```

Actions:

* Tap story → open editor
* “New Story” button
* Filter: Drafts / Published

---

### 2. Story Editor**

Features:

* Title input
* Date picker (default: today)
* Location auto-filled
* Large markdown editor
* Add media button (paste link → embed)
* Save Draft
* Publish

Clean, no clutter.

---

### 3. Add Media Flow**

Options:

* Paste Google Photos link
* Auto-detect Google Photos link in clipboard
* Manage media list under the story

---

### 4. Publish Flow**

When user taps Publish:

1. App constructs final Markdown with frontmatter
2. Generates filename:
   `YYYY-MM-DD-location-title.md`
3. Calls GitHub Content API with commit message
4. If offline → queues publication

After success:

```
✓ Your story is live
```

---

### 5. Settings**

* GitHub PAT
* Repo selection
* Default story folder
* Google Photos album (optional helper)

Set once and forget.

---

## 6. **Web App (Reader Perspective) — UX & Flow**

---

### 6.1 **Homepage (Timeline)**

Design:

* Vertical timeline
* Left side: date markers
* Right side: title + preview + thumbnail

Example:

```
● Mar 28 — Bangkok
  Slow Morning Walk
  “Warm rain hit the streets...”
  [small cover photo]

● Mar 21 — Saigon
  The Man on Bus 56
  “Met someone who…”
```

Reader actions:

* Scroll
* Open a story
* (optional) Filter by location or tag

Experience: browsing a personal notebook.

---

### 6.2 **Story Page**

Elements:

* Handwritten-style title
* Date + location
* Hero image
* Beautiful serif text
* Sections of writing
* Polaroid-style images inline
* Inline videos with rounded corners
* Captions in handwritten font
* Soft animations

Bottom:

* Next/previous story navigation
* Optional “stories from same location”

---

### 6.3 **About Page**

Simple card:

* Profile photo
* Short intro
* Why you travel
* Social links (optional)

---

### 6.4 **Map Page (Optional)**

* Watercolor map background
* Pinpoints drawn as small dots
* Clicking a location shows stories written there

Intentionally minimal — more aesthetic than functional.

---

## 7. **User Journeys**

---

### 7.1 **Android App User Journey (Your Perspective)**

**You (the traveler):**

### 1. Morning

Take photos/videos during a walk.

### 2. Café

Open app → “New Story”.
Write a paragraph or two.
Paste 2–3 photo links.
Save as draft.

### 3. On a bus (offline)

Add more to the draft.
App saves locally.

### 4. In hostel with Wi-Fi

Open app → publish.
Markdown committed to GitHub.
Vercel rebuilds.
Story goes live.

### 5. Share story link (optional)

You send your coworkers the story.

Seamless, zero friction, no laptop required.

---

### 7.2 **Reader Journey (Web App)**

**A coworker or friend:**

1. Opens your journal homepage.
2. Sees warm notebook-style timeline.
3. Clicks “Slow Morning in Bangkok”.
4. Reads personal story with cozy typography.
5. Views photos as polaroid inserts.
6. Watches a short embedded video.
7. Clicks “Next story” or returns to timeline.

Experience feels personal, warm, and human.

---

## 8. **Day-in-the-Life Example**

### Morning

You wake up in Ubud, Bali.
Fog rolling over rice terraces — you take 4 photos and a 5-second video.

### 10 AM

At a small café, you write:

> “I woke up to a soft curtain of fog…”

Add photos (paste Google Photos links).
Save as draft.

### 1 PM Bus Ride

Add another paragraph offline.

### 6 PM

Back at hostel → publish story.
Vercel deploys.
Link is live.

### Night

You read your own story on your site — it feels like a warm journal entry.
You send it to a coworker who enjoys reading about your trip.

---

## 9. **Future Enhancements (Optional Ideas)**

Not needed now, but possible:

* Audio clips (sounds of the street)
* “People I Met” section
* Tag pages (“Rainy moments”, “Night walks”)
* Automatic location extraction from phone
* Offline sync improvements
* Multiple albums or album auto-detection

---

## 10. **Conclusion**

This system is:

* **Lightweight**
* **Offline-ready**
* **Aesthetic and personal**
* **Technically simple**
* **Perfect for slow travel**

You create meaningful travel stories without overhead, and readers get a warm, cozy journal experience that feels human.
