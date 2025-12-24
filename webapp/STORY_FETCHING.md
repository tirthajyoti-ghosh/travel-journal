# 📚 Story Fetching - Runtime Approach

Simple runtime story fetching with automatic environment detection.

---

## 🎯 How It Works

### Development Mode
- Reads faker-generated stories from `../stories` folder
- No network calls, instant loading
- Perfect for UI development and testing

### Production Mode  
- Fetches published stories from GitHub at **runtime**
- Only shows non-draft, non-archived stories
- Cached for 60 seconds using Next.js ISR
- **No rebuild needed** - stories appear immediately after push!

---

## ⚙️ Configuration

### Development (Local)

No configuration needed! Just run:

```bash
cd webapp
npm run dev
```

Uses stories from `../stories` automatically.

### Production (Vercel)

Set these environment variables in Vercel:

```bash
NEXT_PUBLIC_GITHUB_OWNER=your-username
NEXT_PUBLIC_GITHUB_REPO=travel-journal-stories
NEXT_PUBLIC_GITHUB_BRANCH=main
```

**Important:** Use `NEXT_PUBLIC_` prefix for runtime access!

---

## 🔄 Deployment Flow

```
📱 Publish story from mobile app
         ↓
🐙 Push to GitHub main branch
         ↓
✨ Story appears on site immediately!
   (within ~60 seconds due to ISR cache)
```

**No webhook, no rebuild, no GitHub Actions needed!** ✨

---

## 📊 Performance

- **First request:** Fetches from GitHub (~500ms)
- **Subsequent requests:** Served from cache (instant)
- **Cache duration:** 60 seconds
- **Auto-refresh:** Cache revalidates every 60s

---

## ✅ Advantages

1. **Simple** - No build complexity, no webhooks
2. **Fast** - Stories appear within 60 seconds of push
3. **No Auth** - Public repo, no API keys needed
4. **Cached** - Uses Next.js ISR for performance
5. **Runtime** - Always fetches latest published stories

---

## 🔍 Environment Detection

The API automatically detects the environment:

```typescript
// Server-side
if (VERCEL_ENV === 'production' || NODE_ENV === 'production') {
  // Fetch from GitHub
} else {
  // Read from filesystem
}
```

---

## 🐛 Troubleshooting

### No stories in production?

**Check:**
1. Environment variables are set in Vercel (with `NEXT_PUBLIC_` prefix)
2. Stories repository is public
3. Stories exist in `stories/` directory
4. Stories are not marked as `draft: true` or `archived: true`

**Debug:**
Check Vercel function logs for error messages.

### Stories not updating?

**Wait 60 seconds** - ISR cache needs to expire.

Or force refresh by adding `?refresh=1` to URL (in dev mode).

---

## 📝 Example Environment Variables

```bash
# Production (Vercel)
NEXT_PUBLIC_GITHUB_OWNER=johndoe
NEXT_PUBLIC_GITHUB_REPO=travel-journal-stories
NEXT_PUBLIC_GITHUB_BRANCH=main

# Development (local .env)
CONTENT_DIR=../stories
```

---

**That's it!** Simple, clean, and works perfectly. 🎉

