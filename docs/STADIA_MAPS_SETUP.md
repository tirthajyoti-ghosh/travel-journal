# Stadia Maps Setup Guide

This application uses Stadia Maps for beautiful watercolor-style map tiles. Stadia Maps uses **domain-based authentication** rather than API keys in the code.

## Why You Need This

Without proper domain registration, you'll see "401 Error - Invalid Authentication" messages on your map tiles.

## Setup Instructions

### 1. Create a Stadia Maps Account

1. Go to [https://stadiamaps.com/](https://stadiamaps.com/)
2. Sign up for a free account
3. Free tier includes **200,000 tile requests per month** (more than enough for most personal projects)

### 2. Register Your Domains

In your Stadia Maps dashboard, add the following domains:

#### For Local Development:
- `localhost`
- `localhost:3000` (or whatever port you use)

#### For Production (Vercel):
- Your production domain: `your-app-name.vercel.app`
- If you have a custom domain: `yourdomain.com`

#### For Preview Deployments:
- Option 1: Use wildcard `*.vercel.app` (if your plan supports it)
- Option 2: Register specific preview URLs as needed

### 3. That's It!

No code changes or environment variables needed. Authentication happens automatically based on the HTTP Referer header (the domain making the request).

## How It Works

When your app requests map tiles from `tiles.stadiamaps.com`, Stadia Maps checks the request's origin domain against your registered domains. If it matches, the tiles load successfully.

## Troubleshooting

### Still seeing 401 errors?

1. **Check domain spelling** - Make sure you registered the exact domain (including subdomain)
2. **Wait a few minutes** - Domain registration changes may take a moment to propagate
3. **Check the browser console** - See which domain is being sent in the request
4. **Wildcard domains** - If using `*.vercel.app`, ensure your plan supports wildcard domains

### Different domains for different environments?

You can register multiple domains in the Stadia Maps dashboard:
- Development: `localhost`
- Staging: `staging.yourdomain.com`
- Production: `yourdomain.com`
- Vercel: `your-app.vercel.app`

## Cost & Limits

**Free Tier:**
- 200,000 tile requests/month
- Perfect for personal projects and small websites

**If you exceed limits:**
- Consider upgrading to a paid plan
- Optimize tile caching in your application
- Monitor usage in the Stadia Maps dashboard

## Alternative: Using API Keys

If you prefer API key authentication (e.g., for mobile apps or environments without reliable domain headers), you can append `?api_key=YOUR_KEY` to the tile URL. However, for web applications, domain-based auth is simpler and more secure.

