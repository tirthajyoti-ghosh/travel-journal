# **Fantasy Adventure Logbook — Public Stories Page (View-Only)**

**Design Document (v2.0 — Reader Edition)**
Purpose: Define the look, feel, UX, and front-end design of the **public-facing stories page** where visitors read your adventure stories presented as logbook entries.

### No editing.

### No toolbar.

### No contenteditable.

Only beautifully rendered stories.

---

# **1 — Design Goals**

The public Stories Page should feel like:

### **“Reading a preserved explorer’s journal — digitized gently, not modernized.”**

Key principles:

* **Immersive notebook aesthetic** using parchment textures + faint ruled lines.
* **Pure reading experience**: no buttons, no chrome, no distractions.
* **Vertical scroll** mimic flipping through a long page of a travel logbook.
* **Warm, handcrafted design** using your uploaded textures and watercolor assets.
* **Ambient storytelling**: stamps, doodles, paper edges, tapes — but subtle.
* **Fully responsive**: keep the same journal charm on mobile.

---

# **2 — Page Structure Overview**

A single story is presented as one long “scroll” page.

```
Header (site navigation)
─────────────────────────────
Story Container (centered)
  • Page Header Art
      - Title (large serif)
      - Location + Date metadata
      - Thin ink flourish divider
  • Story Body (ruled notebook area)
      - Paragraphs
      - Highlighted quotes
      - Section breaks
  • Media Artifacts
      - Polaroid photos with tape
      - Collages
      - Pinned drawings/maps
  • Margin Doodles
  • Footer Stamp (Visited / Adventure Seal)
─────────────────────────────
Site Footer
```

---

# **3 — Assets & Filenames**

Use your existing textures + decorative icons.

### **Textures**

* `/textures/sea-watercolor.png` — subtle watercolor wash top banner
* `/textures/paper-texture.png` — main parchment grain
* `/textures/paper-hatch.png` — light aging pattern overlay
* `/textures/paper-cracks.png` *(optional, new)* — edge wear / vignette

### **Decorative**

* `/icons/compass.svg` — watermark
* `/icons/quill.svg` — small decorative meta icon
* `/icons/stamp-visited.svg` — footer stamp
* `/icons/pushpin.svg` — used in media blocks
* `/icons/tape-left.png`, `/icons/tape-right.png` — for photos

### **Fonts**

* Headings: **Playfair Display**
* Body: **Lora or Merriweather**
* Captions: **Amatic SC** for handwriting-style notes

---

# **4 — The Visual System**

## **4.1 Color Palette (Reader Version)**

* **Parchment Base:** `#F3E8D2`
* **Ink Text:** `#22201B`
* **Sepia Accents:** `#7A5C3B`
* **Soft Highlight:** `#F2D9A6`
* **Old-Paper Shadow:** `rgba(0,0,0,0.08)`

---

## **4.2 Page Background + Texture Layers**

Each story page uses 2–3 stacked background textures:

```
Layer 1: parchment base — paper-texture.png
Layer 2: faint watercolor wash at the top — sea-watercolor.png
Layer 3: hatch aging — paper-hatch.png (5–8% opacity)
```

This gives the “old notebook page” feel.

---

# **5 — Story Header**

## **5.1 Header Area Design**

This sits at the top of the story page.

**Elements:**

* Soft watercolor fade (from `sea-watercolor.png`)
* Compass SVG watermark (very low opacity: 3–5%)
* Title in large serif font
* Location + Date row
* Ink flourish divider

### Example Visual Layout:

```
     (soft watercolor wash)
          [ Compass watermark ]
────────────────────────────────
       The Road to Varkala
     Kerala, India • Feb 2024
────────────────────────────────
```

**Typography:**

* **Title:** Playfair Display, 44–52px
* **Metadata:** Lora, 14–15px, gray-sepia

---

# **6 — Story Body (Ruled Notebook Area)**

The main text body mimics a **lined notebook page** sitting on parchment.

### **Notebook Lines**

Use a repeating linear gradient:

```css
background-image: repeating-linear-gradient(
  transparent,
  transparent 28px,
  rgba(0, 0, 0, 0.04) 28px 29px
);
```

### **Text Layout**

* Max width: **760px**
* Padding: **48px top/bottom**, **32px sides**
* Line height: **1.65** for easy reading
* Slight letter-spacing for old-paper charm
* Occasional decorative drop caps allowed (larger first letter).

---

# **7 — Media Artifacts**

Media is rendered as physical objects “attached” to the notebook.

## **7.1 Polaroid Photo Style**

**Elements:**

* White or faded frame
* Slight rotation (-3° to +3°)
* Soft shadow
* Paper tape PNG on corners

Example CSS concept:

```css
.artifact-polaroid {
  padding: 10px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  transform: rotate(-2deg);
}
```

## **7.2 Collages**

For 2–3 photos:

* Overlap slightly
* Each rotated differently
* Tapes on one or two corners

## **7.3 Videos**

Videos appear inside parchment “scroll” frames:

* Paper-texture background
* Rounded corners
* A subtle border
* Play button styled as ink-drawn triangle

## **7.4 Captions**

Handwritten style:

* Amatic SC, 14–16px
* Slight tilt
* Very light ink color

---

# **8 — Marginalia & Doodles**

Margin doodles reinforce the explorer journal vibe.

Examples:

* Compass outline
* Hand-drawn arrows
* Small note-like scribbles (“temple ruins 3km →”)
* Decorative quill watermark

**Opacity:** 3–6%
**Placement:** random but intentional near paragraphs or media blocks.

---

# **9 — Story Footer**

The bottom of each story page includes:

### **9.1 Footer Stamp**

A “Visited / Verified Adventure” stamp:

* From `/icons/stamp-visited.svg`
* Use multiply blending for ink effect
* Slight rotation

### **9.2 Footer Meta**

* Reading time
* Published date
* Small ink flourish divider

---

# **10 — Animations & Microinteractions (Reader Only)**

### Subtle “journal unroll” on page load:

* Fade in
* Slight 4–8 px upward motion

### Media hover (desktop only):

* Slight lift (`transform: translateY(-2px)`)
* Very gentle shadow increase

### Parallax (optional, low intensity):

* Watercolor header moves slower than body text

These must **never distract** from reading.

---

# **11 — Responsive Behavior**

### **Mobile**

* Content width = 90%
* Notebook lines remain
* Texture layers preserved but lighter
* Polaroids centered and scaled down
* Collage becomes vertical stack when narrow

### **Tablet/Desktop**

* 720–760px column
* Side doodles visible

### **Large screens**

* Increase margins, not text width
* Keep column narrow to preserve the cozy journal look

---

# **12 — CSS Snippets (Only Show For Viewing)**

### Page Container

```css
.logbook-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 32px;
  background-image:
    url('/textures/paper-texture.png'),
    linear-gradient(180deg, rgba(255,255,250,0.96), rgba(247,242,230,0.96));
  background-size: cover;
  box-shadow: 0 30px 80px rgba(0,0,0,0.1);
}
```

### Story Body Lines

```css
.logbook-body {
  background-image: repeating-linear-gradient(
    transparent,
    transparent 28px,
    rgba(0,0,0,0.04) 28px 29px
  );
  padding: 32px 28px;
  line-height: 1.65;
}
```

### Polaroid

```css
.artifact-polaroid {
  background: #fff;
  padding: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  transform: rotate(-2deg);
  margin: 32px auto;
}
```

---

# **13 — Component Breakdown (View-Only Version)**

```
<StoryPage>
  <StoryHeader>
    - Watercolor Banner
    - Compass Watermark
    - Title
    - Location + Date
    - Ink Divider
  </StoryHeader>

  <StoryBody>
    - Paragraphs
    - Quotes
    - Section Breaks
    - Artifact Blocks (Image, Gallery, Video)
    - Side Doodles (decorative only)
  </StoryBody>

  <StoryFooter>
    - Stamp
    - Published Info
  </StoryFooter>
</StoryPage>
```

---

# **14 — Possible Add-Ons (Optional)**

If you want later:

* A **Table of Contents** generated from story headings
* A **“Read Next Adventure”** section at bottom
* A **Map-based story index** using Leaflet (already planned)
* Animated page-turn sound when entering story
