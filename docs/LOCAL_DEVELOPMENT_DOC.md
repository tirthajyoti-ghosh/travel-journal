# 🛠️ Local Development & Testing Strategy

**Architecture:** Two-Repo System
**Goal:** Decouple code from content, allowing safe local iteration and robust end-to-end testing.

---

## 1. 🏗️ Architecture Overview

We separate the application code from the user content to ensure the "CMS" (GitHub) remains clean and versioned independently.

*   **Repo A (`travel-journal`):** Contains the source code.
    *   `/app`: Expo React Native mobile app.
    *   `/webapp`: Next.js website.
    *   `/scripts`: Tooling for seeds and validation.
    *   `/stories`: **Ignored from Git.** A local-only folder used to store generated mock data for testing the webapp.
*   **Repo B (`travel-journal-stories`):** Contains **only** content.
    *   `/stories/*.md`: The markdown posts are stored in a `stories` folder at the root.
    *   Branches: `main` (production), `dev-playground` (testing).

---

## 2. 🖥️ Web App Local Development (`/webapp`)

**Challenge:** Render the UI without needing to fetch from GitHub API constantly or wait for builds.
**Solution:** Configurable Content Path + Mock Seeding.

### Environment Variables

Create a `.env.local` file in the `/webapp` directory with the following:

```bash
# Content directory path (relative to webapp directory)
CONTENT_DIR=../stories
```

### Stadia Maps Setup (Required for Map Tiles)

Stadia Maps uses domain-based authentication instead of API keys:

1. **Sign up:** Go to [https://stadiamaps.com/](https://stadiamaps.com/) and create a free account (includes 200,000 tile requests/month)

2. **Register your domains** in the Stadia Maps dashboard:
   - For **local development**: Add `localhost` or `localhost:3000`
   - For **production**: Add your Vercel domain (e.g., `your-app.vercel.app`)
   - For **preview deployments**: Add `*.vercel.app` as a wildcard or register specific preview URLs

3. **No code changes needed** - authentication happens automatically based on the domain making the request

### Mode A: UI & Design (Mock Data) — *Recommended for daily work*
Use this when refining CSS, animations, typography, or components.

*   **Tooling:**
    *   **Library:** We will use `@faker-js/faker` to generate realistic travel stories (dates, locations, titles, paragraphs).
    *   **Script:** `scripts/seed-mocks.js` will use Faker to generate 10-20 varied stories.
    *   **Storage:** The script writes these files to `travel-journal/stories`.
    *   **Git:** The `stories/` folder must be added to `.gitignore`. We commit the *script*, but not the *output*.

*   **Setup:**
    1.  `npm install @faker-js/faker` in the root or scripts workspace.
    2.  `npm run seed`. This fills `travel-journal/stories` with fresh dummy data.
    3.  **Env Var:** `CONTENT_DIR=../stories` (relative to webapp).

*   **Workflow:**
    1.  `npm run seed` (Generates fresh dummy stories).
    2.  `npm run dev`.
    3.  Next.js reads files from `../stories`. Hot-reloading works instantly.

### Mode B: Real Content Preview (Production Data)
Use this to see how your *actual* published stories look locally.

*   **Setup:**
    1.  Clone **Repo B** (`travel-journal-stories`) to a sibling directory on your machine.
        ```bash
        /personal/travel-journal
        /personal/travel-journal-stories  <-- Cloned here
        ```
    2.  **Env Var:** `CONTENT_DIR=../../travel-journal-stories/stories`
*   **Workflow:**
    1.  `npm run dev`.
    2.  Next.js reads real markdown files from the sibling repo.

---

## 3. 📱 Mobile App Local Development (`/app`)

**Challenge:** Test the "Publish" flow without polluting the public website.
**Solution:** GitHub Branch Targeting.

*   **Setup:**
    *   In **Repo B**, create a permanent branch named `dev-playground`.
    *   In the Mobile App config, we add logic to switch the **target branch** based on the environment.

    ```typescript
    // Config.ts logic
    export const GITHUB_CONFIG = {
      owner: 'your-username',
      repo: 'travel-journal-stories',
      branch: __DEV__ ? 'dev-playground' : 'main', // Target 'dev-playground' in debug mode
      path: 'stories/'
    };
    ```

*   **Workflow:**
    1.  Run the app (`npx expo start`).
    2.  Write a story and select media.
    3.  Tap **Publish**.
    4.  App commits the file to the `dev-playground` branch of Repo B.
    5.  **Verification:** Check GitHub.com to see the file appear in the `dev-playground` branch.

---

## 4. 🔄 End-to-End Integration Loop

**Goal:** Write on Phone -> See on Localhost Web App.

1.  **Phone:** App is in Debug Mode (Target: `dev-playground`).
2.  **Action:** Publish a story from the phone.
3.  **Laptop:**
    *   Go to your local clone of Repo B (`travel-journal-stories`).
    *   Switch to the playground branch and pull.
    ```bash
    cd ../travel-journal-stories
    git checkout dev-playground
    git pull origin dev-playground
    ```
4.  **Laptop (Web App):**
    *   Ensure `.env.local` points to this sibling repo (`CONTENT_DIR=../../travel-journal-stories/stories`).
    *   The local Next.js server detects the file change and hot-reloads.
5.  **Result:** The story you just wrote on your phone appears on your localhost browser.

---

## 5. 🚀 Implementation Checklist

### Phase 1: Scaffold
- [ ] Initialize `travel-journal` repo with `/app` and `/webapp`.
- [ ] Create `travel-journal-stories` repo with a `/stories` folder (initially empty).
- [ ] Create root `/stories` folder in `travel-journal` and add to `.gitignore`.

### Phase 2: Web Tooling
- [ ] Install `@faker-js/faker` for seed data generation.
- [ ] Create `scripts/seed-mocks.js` to generate random stories into `/stories`.
- [ ] Implement `getStories` in Next.js to read from `process.env.CONTENT_DIR`.

### Phase 3: Mobile Tooling
- [ ] Implement GitHub Service in Expo with `branch` parameter.
- [ ] Add "Dev Mode" indicator in the App UI.
