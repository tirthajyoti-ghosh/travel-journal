# 🚀 Deployment Guide - Simple Runtime Approach

Deploy your travel journal webapp to Vercel in 2 minutes.

---

## ✅ Pre-Deployment Checklist

- [ ] Stories repository exists on GitHub
- [ ] Repository is **public** (no auth needed)
- [ ] At least one published story exists (not draft/archived)
- [ ] Webapp runs locally: `npm run dev`

---

## 📝 Deployment Steps

### Step 1: Push to GitHub

```bash
cd webapp
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your webapp repository
3. Framework: **Next.js** (auto-detected)
4. Root Directory: `webapp` (if monorepo) or `.` (if standalone)

### Step 3: Set Environment Variables

In Vercel project settings, add:

```bash
NEXT_PUBLIC_GITHUB_OWNER=your-github-username
NEXT_PUBLIC_GITHUB_REPO=travel-journal-stories
NEXT_PUBLIC_GITHUB_BRANCH=main
```

**Important:** Use `NEXT_PUBLIC_` prefix!

### Step 4: Deploy

Click **Deploy** and wait ~1-2 minutes.

---

## ✨ How It Works

```
📱 Publish story from mobile app
         ↓
🐙 Push to GitHub main branch
         ↓
⏱️  Wait ~60 seconds (cache expiry)
         ↓
✨ Story appears on site!
```

**No webhooks, no rebuilds, no GitHub Actions!**

Stories are fetched at **runtime** and cached for 60 seconds.

---

## 🔍 Verify Deployment

### 1. Check Site Loads

Visit `https://your-project.vercel.app`

### 2. Check Stories Appear

- Map should display with story pins
- Click a pin to view story
- Check browser console for logs:
  ```
  🌐 Fetching stories from GitHub: username/repo (main)
  📚 Found X story files
  ✅ Loaded Y published stories
  ```

### 3. Test Story Update

1. Publish a new story from mobile app
2. Wait 60 seconds
3. Refresh your site
4. New story should appear!

---

## 🐛 Troubleshooting

### No stories appear

**Check:**
1. Environment variables are set with `NEXT_PUBLIC_` prefix
2. Repository is public
3. Stories exist in `stories/` directory
4. Stories are not marked as `draft: true`

**Debug:**
- Open browser console
- Look for error messages in logs
- Check Vercel function logs

### Stories not updating

**Wait 60 seconds** - ISR cache needs to expire.

The cache revalidates every 60 seconds, so new stories will appear within that timeframe.

### GitHub API rate limit

**Symptom:** 403 errors from GitHub API

**Solution:** 
- Public repos: 60 requests/hour (should be fine)
- If needed, add `GITHUB_TOKEN` for higher limits

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| First load | ~500ms (GitHub fetch) |
| Cached load | Instant |
| Cache duration | 60 seconds |
| Story update time | Within 60 seconds |

---

## 🔐 Private Repository Support

If your stories repo is private, add a GitHub token:

1. Generate token at: https://github.com/settings/tokens
2. Scopes: `repo` (full access) or `public_repo`
3. Add to Vercel:
   ```bash
   GITHUB_TOKEN=ghp_your_token_here
   ```

4. Update `lib/api.ts` to include token in headers:
   ```typescript
   headers: {
     'Accept': 'application/vnd.github.v3+json',
     'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
   },
   ```

---

## 📚 Related Documentation

- [Story Fetching Guide](./STORY_FETCHING.md) - How it works
- [README](./README.md) - Getting started
- [Project Documentation](../docs/PROJECT_DOC.md) - Full overview

---

## 🎉 Success!

Your travel journal is now live! 

Every time you publish a story from your mobile app, it will appear on your site within 60 seconds. No manual deployment needed!

**Site URL:** `https://your-project.vercel.app`

---

**Questions?** Check the [Story Fetching Guide](./STORY_FETCHING.md) for more details.

