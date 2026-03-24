# Deployment Guide

This guide covers deploying Chicago Explorer as two separate services: the Express backend to Railway and the React frontend to Vercel.

---

## Prerequisites

Before starting, have accounts and API keys ready for:

- **Vercel** — vercel.com (free tier is fine)
- **Railway** — railway.app (free trial, then usage-based)
- **Mapbox** — mapbox.com (pay-as-you-go; free up to 50,000 map loads/month)
- **CTA Train Tracker** — transitchicago.com/developers (free, register for key)
- **Yelp Fusion** — yelp.com/developers (free, 500 requests/day)
- **OpenWeatherMap** — openweathermap.org (free tier)
- **Anthropic** (optional, Phase 2) — console.anthropic.com
- **Ticketmaster** (optional, Phase 2) — developer.ticketmaster.com

---

## 1. Deploy Backend to Railway

### Create the project

1. Go to railway.app and log in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Authorize Railway to access your GitHub account if prompted.
4. Select the `chicago-explore` repository.
5. When Railway asks which directory to use, set the **Root Directory** to `backend`.
6. Railway will detect the `Procfile` (`web: node server.js`) and configure the start command automatically.

### Set environment variables

In the Railway project dashboard, go to **Variables** and add the following:

```
CTA_API_KEY=your_cta_key_here
YELP_API_KEY=your_yelp_key_here
OPENWEATHER_API_KEY=your_openweather_key_here
TICKETMASTER_API_KEY=your_ticketmaster_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
FRONTEND_URL=https://your-frontend.vercel.app
PORT=3001
```

Leave `FRONTEND_URL` as a placeholder for now — you will fill it in after the frontend is deployed.

### Get the backend URL

After the first deploy completes, go to **Settings** → **Domains** in the Railway dashboard and either use the auto-generated domain or add a custom one. Copy this URL — you will need it when setting up the frontend.

It will look like: `https://your-project-name.railway.app`

---

## 2. Deploy Frontend to Vercel

### Create the project

1. Go to vercel.com and log in.
2. Click **Add New** → **Project**.
3. Import the `chicago-explore` GitHub repository.
4. Under **Root Directory**, click **Edit** and set it to `frontend`.
5. Vercel will detect Vite automatically. The build settings should be:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Do not deploy yet — add environment variables first.

### Set environment variables

In the project configuration screen (before clicking Deploy), go to **Environment Variables** and add:

```
VITE_MAPBOX_TOKEN=your_mapbox_public_token
VITE_API_URL=https://your-project-name.railway.app
```

Use the Railway backend URL you copied in step 1 for `VITE_API_URL`.

7. Click **Deploy**.

### Verify the vercel.json SPA rewrite

The `frontend/vercel.json` file already contains the SPA rewrite rule so that React Router routes work correctly on direct load:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

No changes needed — it is already committed to the repo.

---

## 3. Connect Frontend and Backend

Once both deploys succeed:

1. Copy the Vercel deployment URL (e.g. `https://chicago-explorer.vercel.app`).
2. Go to the Railway project → **Variables**.
3. Update `FRONTEND_URL` to the real Vercel URL.
4. Railway will automatically redeploy with the updated variable.

This updates the CORS allowlist on the backend so the frontend can make API requests.

---

## 4. Mapbox Token Security

Mapbox public tokens are visible in the browser. Restrict the token to your Vercel domain so it cannot be used from other origins.

1. Go to mapbox.com → **Tokens** → click your token.
2. Under **Allowed URLs**, add your Vercel domain:
   ```
   https://your-app.vercel.app
   ```
   Also add `http://localhost:5173` for local development (or use a separate dev token).
3. Save the token.

### Set a usage alert

1. In the Mapbox dashboard, go to **Billing** → **Usage Alerts**.
2. Set a monthly alert at a comfortable threshold (e.g. $5 or $10) so you are notified before unexpected charges.

---

## 5. Verify the Deployment

Work through this checklist after both services are live:

- [ ] Visit the Vercel URL — the home page loads with the Mapbox 3D map centered on Streeterville
- [ ] CTA train dots appear on the map within a few seconds
- [ ] The IntelFeed overlay shows weather, lake conditions, and CTA arrivals
- [ ] `/transit` loads all 8 L lines with live train positions and Divvy bike stations
- [ ] `/food` loads the Yelp restaurant map; cuisine filters and open-now toggle work
- [ ] No CORS errors appear in the browser console
- [ ] The Mapbox token is restricted to your Vercel domain and still works

### Check Railway logs

If the backend is not responding, go to the Railway project → **Deployments** → click the active deployment → **View Logs** to diagnose startup errors or missing environment variables.

### Redeploy after env var changes

If you add or update environment variables in Railway or Vercel after the initial deploy:

- **Railway** — redeployment is automatic when variables are changed via the dashboard.
- **Vercel** — go to **Deployments** → find the latest deployment → click the three-dot menu → **Redeploy**.
