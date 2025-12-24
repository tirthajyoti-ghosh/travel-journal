This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 📖 Travel Journal Web App

A beautiful, cozy travel journal that displays stories on an interactive watercolor map. Stories are written in the mobile app and published to GitHub, then fetched at runtime.

### 🗺️ Story Fetching

**Development:** Reads faker stories from `../stories` (instant)  
**Production:** Fetches from GitHub at runtime (cached 60s)

**No rebuild needed!** Stories appear ~60 seconds after push to GitHub.

See [STORY_FETCHING.md](./STORY_FETCHING.md) for details.

---

## Getting Started

### Environment Setup

1. **Stadia Maps Authentication** (required for map tiles):
   - Sign up at [https://stadiamaps.com/](https://stadiamaps.com/)
   - In your Stadia Maps dashboard, register your allowed domains:
     - For local development: `localhost`
     - For production: your Vercel domain (e.g., `your-app.vercel.app`)
   - Stadia Maps uses domain-based authentication, so no API keys needed in code

2. **Story Configuration**:
   
   **For Development:**
   - No configuration needed!
   - Uses faker stories from `../stories` automatically
   
   **For Production (Vercel):**
   - Set environment variables in Vercel:
     ```
     NEXT_PUBLIC_GITHUB_OWNER=your-username
     NEXT_PUBLIC_GITHUB_REPO=travel-journal-stories
     NEXT_PUBLIC_GITHUB_BRANCH=main
     ```
   - **Important:** Use `NEXT_PUBLIC_` prefix for runtime access!

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🚀 Deploy on Vercel

### Quick Deploy (2 Minutes)

1. Push your webapp to GitHub
2. Import project in [Vercel](https://vercel.com/new)
3. Set environment variables:
   ```
   NEXT_PUBLIC_GITHUB_OWNER=your-username
   NEXT_PUBLIC_GITHUB_REPO=travel-journal-stories
   NEXT_PUBLIC_GITHUB_BRANCH=main
   ```
4. Deploy!

**That's it!** No webhooks, no GitHub Actions needed.

### How Stories Update

```
📱 Publish story → 🐙 Push to GitHub → ✨ Appears on site (within 60s)
```

Stories are fetched at **runtime** with 60-second caching. No rebuild needed!

---

## 📚 Documentation

- [Story Fetching Guide](./STORY_FETCHING.md) - How stories are loaded
- [Project Documentation](../docs/PROJECT_DOC.md) - Complete project overview
- [Map Technical Documentation](../docs/MAP_TECHNICAL_DOC.md) - Map implementation
- [Design Guidelines](../docs/WEBAPP_DESIGN_GUIDELINES_DOC.md) - UI/UX guidelines

---

## 🧪 Testing Production Mode Locally

Test GitHub story fetching on your local machine:

```bash
# Set environment variables
export NODE_ENV=production
export NEXT_PUBLIC_GITHUB_OWNER=your-username
export NEXT_PUBLIC_GITHUB_REPO=travel-journal-stories
export NEXT_PUBLIC_GITHUB_BRANCH=main

# Run dev server
npm run dev
```

Check console output for:
```
🌐 Fetching stories from GitHub: username/repo (main)
📚 Found X story files
✅ Loaded Y published stories
```

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
