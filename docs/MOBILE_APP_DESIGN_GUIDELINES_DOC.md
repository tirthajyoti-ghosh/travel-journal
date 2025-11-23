# 📝 **Travel Diary Notebook — Mobile App UI/UX Design Document**

---

# ⚡ 1. **Design Philosophy**

This app is:

* For **one user only** → **you**
* A **minimal**, **cozy**, **warm** travel journal
* Focused on **writing first**, media second
* Extremely **low complexity** → no feeds, no timelines, no map, no fancy navigation
* Built for **fast journaling** during travel while working remotely
* Designed to feel like a **digital notebook**, not an app

The entire product revolves around **three screens**:

1. Home (Story List)
2. Create/Edit Story (Notebook Page)
3. Story View (Same layout, read-only)

---

# 📱 **2. App Structure (3 Screens Only)**

```
App
 ├── Home (story index)
 ├── Story Editor (notebook page)
 └── Story Viewer (notebook page read-only)
```

No tabs.
No map.
No profile.
No settings screen (unless needed later).

---

# 🎨 **3. Visual Style Guide**

### 3.1 Color Palette

Warm, soft, cozy tones:

| Element         | Color                     |
| --------------- | ------------------------- |
| Background      | #FAF7F2 (paper off-white) |
| Notebook Paper  | #F7F3E8 (light parchment) |
| Lines / Borders | #E2D9CA                   |
| Accent          | #D98324 (burnt orange)    |
| Text (Primary)  | #3A2F2A                   |
| Polaroid Frame  | #FCFAF6                   |
| Shadows         | rgba(0,0,0,0.08–0.15)     |

---

### 3.2 Typography

| Use Case            | Font                        |
| ------------------- | --------------------------- |
| Story Titles        | Fraunces / Playfair Display |
| Body Text           | Inter / Lora                |
| Captions            | Inter italic                |
| Handwritten Touches | Shantell Sans (sparingly)   |
| Buttons             | Inter Medium                |

---

### 3.3 Aesthetic Elements

* Soft parchment background texture (very subtle)
* Faded doodles along margins:

  * Airplane
  * Tiny compass
  * Coffee ring
  * Camera icon
* Light shadow under polaroid images
* Gentle floating clouds for loading screen

---

# 🧭 **4. UX Flows**

## 4.1 Home Screen → Story Viewer

1. Open app
2. See list of stories
3. Tap story
4. Story opens in cozy notebook layout

## 4.2 Home Screen → Add Story → Save to GitHub

1. Tap “+ Add Story”
2. Notebook editor appears
3. Write title + body
4. Add images/videos (Google Photos Picker)
5. Tap Save
6. App:

   * Generates slug
   * Saves Markdown + frontmatter
   * Commits to GitHub
7. Vercel rebuilds → web app updated

## 4.3 Edit Story

1. Open story
2. Tap “Edit”
3. Adjust text/media
4. Save → update commit

---

# 🏡 **5. Detailed Screen Designs**

---

# **5.1 Home Screen — “Your Travel Stories”**

### Layout

* Header:
  **Your Travel Stories**
* Tiny corner doodle (e.g., compass)
* Vertical list of story cards

### Story Card Design

* Off-white card (#FDFBF7)
* Slight corner rounding (8px)
* Light border (#E2D9CA)
* Contents:

  * Title
  * Date
  * Tiny polaroid thumbnail (first image)
* Tap entire card → open story

### Floating Action Button (FAB)

* Circular button
* Accent color (#D98324)
* Icon: “+”
* Shadow: soft, warm

**Action:** Opens Story Editor

---

# 📖 **5.2 Story Page (Viewer)**

This is your digital notebook.

### Layout Structure

```
|---------------------------|
|  parchment background     |
|   margin doodles          |
|---------------------------|
|       Title (Serif)       |
|  Date / Location (small)  |
|---------------------------|
|      TEXT BLOCK           |
|  (long paragraphs)        |
|---------------------------|
|      MEDIA BLOCKS         |
|       1 image             |
|       or 2-image collage  |
|       or 3-grid           |
|       or video            |
|---------------------------|
```

### Media Placement Rules

* **1 image:** centered, polaroid frame, mild tilt
* **2 images:** overlapped collage (2–4° rotation)
* **3 images:** 3-grid, each slightly rotated randomly
* **Video:** clean rectangular card, play button in middle

### Doodles

* Very light opacity (3–5%)
* Placed in corners and margins:

  * plane
  * compass
  * camera sketch
  * small “air mail” stamp

### Buttons

* Top-right: **Edit**
* Top-left: **Back**

---

# ✏️ **5.3 Story Editor (Notebook)**

### Editable Fields

* Title input (styled like notebook heading)
* Body text (multi-line, serif font)
* Add Media button:

  * Opens Google Photos Picker
  * You select photos/videos
  * They are inserted in correct block type

### UI Controls

* Simple toolbar:

  * Bold
  * Italic
  * Add Media
* Save button (top-right or bottom)

### Layout

Identical to Story Viewer but with active editing.

### Saving = GitHub Commit

User doesn’t see complexity — it’s seamless.

---

# ☁️ **6. Loading Experience (Clouds)**

You mentioned this and it’s beautiful.

### Cloud Loader

* Faded white clouds drift slowly across screen
* Used during:

  * Opening story
  * Saving story
  * Fetching photos
  * Syncing with GitHub

Animations: subtle horizontal drift.

---

# 🧩 **7. Interaction Details**

### Micro-animations

* Polaroids lift slightly on tap
* Slight shake (1°) on long press
* Doodles fade in softly on scroll
* Save button pulses briefly after saving

### Haptics

* Light tap haptics when:

  * Inserting media
  * Saving
  * Opening a story

---

# 📦 **8. States**

### Empty State (No Stories Yet)

* Large doodle in center (plane + coffee cup)
* Text:
  **Your travel stories will live here.**
  “Tap + to begin.”

### Media Loading State

* Cloud animation
* Text: “Fetching your photos…”

### Error State

* Doodle of broken pencil
* Text: “Something went wrong — please try again.”

---

# 🔐 **9. Constraints**

* You are the only user → no login page required
* App stores PAT securely
* Only one branch (“main”)
* No drafts → everything saved is published
* Markdown files stored flat in a single folder

---

# 🚀 **10. Summary**

This app is:

* Beautiful
* Warm
* Minimal
* Serene
* Cozy
* Notebook-first
* Built for a single traveler
* Zero complexity
* Pure storytelling

You write your story → it becomes a beautiful digital notebook page → it pushes to GitHub → your website updates.

Perfect for long-term slow travel.
