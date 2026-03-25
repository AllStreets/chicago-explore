# Deployment Guide

Chicago Explorer deploys as two separate services: Express backend on **Railway**, React frontend on **Vercel**.

---

## Prerequisites

Have accounts at:

- [railway.app](https://railway.app) — free trial, then usage-based
- [vercel.com](https://vercel.com) — free tier is fine

All API keys are already in `backend/.env` and `frontend/.env` in the repo. Do not commit those files — copy the values into Railway/Vercel as environment variables instead.

---

## 1. Deploy Backend to Railway

### Create the service

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the `chicago-explore` repository
3. Set **Root Directory** to `backend`
4. Railway detects `Procfile` (`web: node server.js`) and configures the start command automatically

### Set environment variables

Go to the service → **Variables** and add all of the following:

```
OPENWEATHER_KEY=<your_openweather_key>
OPENWEATHER_API_KEY=<your_openweather_key>
OPENAI_API_KEY=<your_openai_key>
TICKETMASTER_KEY=<your_ticketmaster_key>
CTA_API_KEY=<your_cta_key>
FRONTEND_URL=https://PLACEHOLDER.vercel.app
```

> Your actual key values are in `backend/.env` locally — copy from there into the Railway dashboard.
> Never commit real keys to the repo.

Leave `FRONTEND_URL` as a placeholder for now — update it after the frontend is deployed.

> **Important:** Do NOT add a `PORT` variable — Railway injects it automatically. Adding it manually will break routing.

### Get the backend URL

After the first deploy: **Settings** → **Domains** → copy the generated URL.

It will look like `https://chicago-explore-production.up.railway.app` — you need this for the frontend.

---

## 2. Deploy Frontend to Vercel

### Create the project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import the `chicago-explore` GitHub repository
3. Set **Root Directory** to `frontend`
4. Vercel detects Vite automatically. Build settings should be:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. **Do not deploy yet** — add environment variables first

### Set environment variables

In the project config → **Environment Variables**:

```
VITE_MAPBOX_TOKEN=<your_mapbox_public_token>
VITE_API_URL=https://your-railway-backend-url.up.railway.app
```

> Your actual token is in `frontend/.env` locally — copy from there into the Vercel dashboard.

Replace `VITE_API_URL` with the Railway URL from step 1.

6. Click **Deploy**

### SPA routing

`frontend/vercel.json` already contains the React Router rewrite — no changes needed:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 3. Connect the Two Services

Once both deploys succeed:

1. Copy your Vercel URL (e.g. `https://chicago-explorer.vercel.app`)
2. Go to Railway → **Variables** → update `FRONTEND_URL` to the real Vercel URL
3. Railway redeploys automatically — this unlocks CORS so the frontend can call the backend

---

## 4. Mapbox Token Security (Optional but Recommended)

The Mapbox token is a public token visible in browser source. Restrict it to your domain:

1. Go to [mapbox.com](https://mapbox.com) → **Tokens** → click your token
2. Under **Allowed URLs**, add:
   ```
   https://your-app.vercel.app
   http://localhost:5173
   ```
3. Save — the token now rejects requests from other origins

Also set a **billing alert** under Mapbox → **Billing** → **Usage Alerts** (e.g. $5/month) to catch unexpected traffic.

---

## 5. Post-Deploy Verification Checklist

- [ ] Home page loads with Mapbox map centered on Streeterville
- [ ] CTA train dots appear on the home map within a few seconds
- [ ] Stadium pins show official team logos (Bulls/Bears on top when overlapping)
- [ ] Food (teal fork) and nightlife (purple martini) icons appear on home map
- [ ] IntelFeed shows weather, sports score, tonight's event, train count, and closest CTA train
- [ ] `/transit` shows all 8 L lines with animated train positions
- [ ] `/food` loads OSM restaurant map; cuisine filters work; Streeterville results appear
- [ ] `/nightlife` loads bars on map with 7 scene profiles including Streeterville
- [ ] `/sports` loads team schedules and live scores
- [ ] `/events` loads Ticketmaster events with color-coded filter tabs
- [ ] `/weather` shows temperature tiles and animated lake scene
- [ ] `/neighborhoods` shows neighborhood list and AI ask box
- [ ] `/explore` shows landmark cards with heart/been buttons
- [ ] `/me` shows Favorites and Been There tabs (empty initially)
- [ ] No CORS errors in the browser console (F12 → Network)

---

## Troubleshooting

**Backend not responding**
- Railway → **Deployments** → active deployment → **View Logs**
- Check that all environment variables are set — missing keys cause startup errors

**CORS errors in browser**
- Confirm `FRONTEND_URL` in Railway exactly matches your Vercel URL (including `https://`, no trailing slash)

**Map shows placeholder instead of map**
- Confirm `VITE_MAPBOX_TOKEN` is set in Vercel environment variables
- Redeploy after adding — Vite bakes env vars at build time, not runtime

**AI features not working**
- Confirm `OPENAI_API_KEY` is valid and has credits
- The app degrades gracefully — AI sections show "add API key to enable" rather than crashing

**Redeploying after env var changes**
- Railway: automatic when vars change via dashboard
- Vercel: **Deployments** → latest → three-dot menu → **Redeploy**
