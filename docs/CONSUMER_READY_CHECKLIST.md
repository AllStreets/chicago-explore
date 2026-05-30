# Consumer Ready Checklist — Chicago Explorer

> Web app (React + Express) targeting public launch on Vercel (frontend) + Railway (backend).
> Work through sections top-to-bottom; critical items must be resolved before going live.

---

## 1. Security — CRITICAL (do before anything else)

- [ ] **Rotate every API key** — all current keys are committed to the repo and must be considered compromised
  - Mapbox: [account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens)
  - OpenWeatherMap: [home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys)
  - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Ticketmaster: [developer.ticketmaster.com](https://developer.ticketmaster.com)
  - CTA: [transitchicago.com/developers](https://www.transitchicago.com/developers/traintracker.aspx)
  - Finnhub, Foursquare, SeatGeek: rotate in their respective dashboards
  - VAPID keys: regenerate with `npx web-push generate-vapid-keys`

- [ ] **Remove `.env` and `frontend/.env` from git history**
  ```bash
  git filter-repo --path backend/.env --invert-paths
  git filter-repo --path frontend/.env --invert-paths
  git push --force
  ```
  Or use [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) as an alternative.

- [ ] **Add `.env` to `.gitignore`** — confirm both `backend/.env` and `frontend/.env` are listed

- [ ] **Enable GitHub secret scanning** — Settings → Code security → Secret scanning → Enable

- [ ] **Move all secrets to platform dashboards** — Railway (backend) and Vercel (frontend) environment variable UIs only; never in code

- [ ] **Restrict the Mapbox token to your production domain** — Mapbox dashboard → token settings → allowed URLs → add `https://your-vercel-domain.vercel.app`

- [ ] **Add rate limiting to the Express API**
  ```bash
  npm install express-rate-limit
  ```
  Apply a global limiter in `server.js` (e.g., 100 req/15 min per IP) and a tighter limiter on AI streaming routes (`/api/explore/stream`, `/api/neighborhoods/ask`)

- [ ] **Harden CORS** — replace the permissive wildcard with your exact Vercel URL in `FRONTEND_URL` and verify the CORS middleware rejects other origins

- [ ] **Add a security headers middleware** (`helmet`)
  ```bash
  npm install helmet
  ```
  Add `app.use(helmet())` near the top of `server.js`

---

## 2. Backend Hardening

- [ ] **Fix duplicate env var** — backend uses both `OPENWEATHER_KEY` and `OPENWEATHER_API_KEY`; consolidate to one and update all routes

- [ ] **Add request logging** — install `morgan` for structured HTTP logs visible in Railway's log viewer
  ```bash
  npm install morgan
  ```

- [ ] **Add a health check endpoint** (if missing) — Railway uses `/` or a dedicated `/health` route for uptime monitoring

- [ ] **Add consistent error responses** — audit all route files for bare `catch { }` blocks; each should return a proper JSON error with an HTTP status code

- [ ] **Add input validation** on user-facing mutation endpoints (`/api/me/favorites`, `/api/me/visited`) to prevent junk data from being written to SQLite

- [ ] **Database backup strategy** — SQLite lives on a Railway ephemeral disk by default; either:
  - Mount a persistent Railway volume and schedule daily exports to S3/R2, or
  - Switch to a hosted Postgres (Railway has a free Postgres tier) and use pg_dump backups

- [ ] **Fix sports cache table** — `sports.js` reuses `yelp_cache` instead of a dedicated table; create a `sports_cache` table to prevent collisions

- [ ] **Remove or secure unused API integrations** — `/finance` (Finnhub), `/news` (politics), `/311` are incomplete; either finish them or disable the routes so they don't leak partial data or error stack traces

---

## 3. Frontend Polish

- [ ] **Add a global toast/notification system** — users get no feedback when saves fail silently; add a lightweight toast (e.g., `react-hot-toast`) wired to `useMe` hook errors

- [ ] **Improve the error boundary** — `PageBoundary` currently shows a generic crash screen; add a "Try again" button and a friendly message

- [ ] **Add a 404 page** — requests to unknown routes fall through to the SPA shell with no content; add a `<Route path="*">` with a proper not-found UI

- [ ] **Add a loading skeleton or spinner** for data-heavy pages (Transit, Sports, Events) — blank white flash on slow connections feels broken

- [ ] **Fix empty/incomplete pages before launch** — `/311`, `/news`, and `/finance` are visibly incomplete; either fill them out or remove them from the sidebar navigation until ready

- [ ] **Add a dark/light theme toggle** (optional but polish) — currently hardcoded to dark; at minimum, respect `prefers-color-scheme` in the CSS

- [ ] **Audit console errors** — open DevTools on every page and resolve any uncaught errors or prop-type warnings before launch

---

## 4. SEO & Discoverability

- [ ] **Add Open Graph meta tags** to `index.html` (used by Twitter, Slack, iMessage previews)
  ```html
  <meta property="og:title" content="Chicago Explorer" />
  <meta property="og:description" content="Live map of Chicago — transit, food, events, sports and more." />
  <meta property="og:image" content="https://your-domain.com/og-image.png" />
  <meta property="og:url" content="https://your-domain.com" />
  <meta name="twitter:card" content="summary_large_image" />
  ```

- [ ] **Create an OG preview image** (1200×630 px) — a screenshot of the map with the app name and tagline; put it in `frontend/public/og-image.png`

- [ ] **Add a descriptive `<meta name="description">`** in `index.html`

- [ ] **Update `<title>`** to something more descriptive — e.g., `"Chicago Explorer — Live City Map"`

- [ ] **Add `robots.txt`** to `frontend/public/`
  ```
  User-agent: *
  Allow: /
  Sitemap: https://your-domain.com/sitemap.xml
  ```

- [ ] **Add `sitemap.xml`** to `frontend/public/` listing all static routes (`/`, `/transit`, `/food`, `/events`, etc.)

- [ ] **Claim the site on Google Search Console** after deployment to monitor indexing

---

## 5. Analytics & Error Monitoring

- [ ] **Add error monitoring** — Sentry is free for small projects; install the React + Node SDKs
  ```bash
  # frontend
  npm install @sentry/react
  # backend
  npm install @sentry/node
  ```
  Wire `Sentry.init()` in `main.jsx` and `server.js`; this gives you stack traces for every uncaught exception in production

- [ ] **Add analytics** — Plausible Analytics (~$9/mo) or Fathom are privacy-first and require no cookie consent banner (GDPR-friendly); add the script tag to `index.html`
  - Alternative: Vercel Analytics (free on Hobby plan) with one `@vercel/analytics` import

- [ ] **Set up uptime monitoring** — UptimeRobot free tier monitors your Railway backend URL every 5 minutes and emails you if it goes down

---

## 6. Deployment & CI/CD

- [ ] **Verify Railway deploy is healthy** — confirm the backend URL responds to `GET /health` and all critical env vars are set in the Railway dashboard

- [ ] **Verify Vercel deploy is healthy** — confirm `VITE_API_URL` points to the live Railway URL (not localhost)

- [ ] **Set up a GitHub Actions CI pipeline**
  ```yaml
  # .github/workflows/ci.yml
  on: [push, pull_request]
  jobs:
    test-backend:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: cd backend && npm ci && npm test
    test-frontend:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: cd frontend && npm ci && npx vitest run
  ```
  This gates merges on passing tests so a bad push can't break prod.

- [ ] **Add a staging environment** — create a second Railway service + Vercel preview deployment pointed at a staging database; test all deploys there before promoting to production

- [ ] **Document the rollback procedure** — note in `DEPLOYMENT.md` how to revert to the previous Railway deployment (it keeps the last N deploys in the dashboard)

---

## 7. PWA & Performance

- [ ] **Add `manifest.json`** to `frontend/public/` for installability (home screen icon on mobile)
  ```json
  {
    "name": "Chicago Explorer",
    "short_name": "Chicago",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#060b18",
    "theme_color": "#00d4ff",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
  Also add `<link rel="manifest" href="/manifest.json" />` to `index.html`

- [ ] **Create app icons** — 192×192 and 512×512 PNG versions of the app logo; place in `frontend/public/`

- [ ] **Add an offline fallback page** — update `sw.js` to cache the shell and serve a "You're offline" page when the network is unavailable

- [ ] **Run Lighthouse on the deployed URL** and resolve any scores below 80 in Performance and Best Practices
  ```bash
  npx lighthouse https://your-domain.com --output html --view
  ```

- [ ] **Add `<link rel="preconnect">` hints** in `index.html` for Mapbox and your Railway API domain to speed up initial load

---

## 8. Accessibility

- [ ] **Add ARIA live regions** for dynamically updating content — live CTA train positions, sports scores refreshing every 90 seconds, and weather tiles should announce updates to screen readers
  ```jsx
  <div aria-live="polite" aria-atomic="true">{scoreDisplay}</div>
  ```

- [ ] **Audit keyboard navigation** on every page — tab through the sidebar, maps, and modal-style sheets; every interactive element should be reachable and operable without a mouse

- [ ] **Check color contrast** — run the deployed site through [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) for secondary text (muted grays on dark background)

- [ ] **Add `lang="en"`** to the `<html>` tag in `index.html` if missing

---

## 9. Legal / Privacy

- [ ] **Write and host a Privacy Policy** — required if you collect any user data (anonymous user ID + favorites stored in SQLite counts); cover:
  - What data is collected (anonymous ID, saved places, notes)
  - How long it is retained
  - How users can request deletion
  - No third-party advertising
  - Contact email

- [ ] **Write Terms of Service** (optional but recommended for a public product)

- [ ] **Add a Privacy Policy link** in the app footer or settings page

- [ ] **GDPR / CCPA consideration** — if your analytics provider uses cookies, add a cookie consent notice; Plausible/Fathom are cookieless and exempt from this

- [ ] **Clarify AI disclaimer** — the Neighborhoods and Explore AI chat uses OpenAI; add a small disclaimer that responses are AI-generated and may be inaccurate

---

## 10. Custom Domain (Optional but Recommended)

- [ ] **Register a domain** — e.g., `chicagoexplorer.app` or `explorechicago.city` (~$12/yr via Namecheap or Cloudflare Registrar)

- [ ] **Add domain to Vercel** — Vercel → Project → Settings → Domains → add your domain; Vercel auto-provisions a TLS certificate

- [ ] **Update Mapbox token URL restriction** to the new custom domain

- [ ] **Update Railway `FRONTEND_URL`** env var to the new domain for CORS to keep working

- [ ] **Redirect the old `.vercel.app` URL** to the custom domain in Vercel settings

---

## 11. Final Smoke Test (run on the live production URL)

- [ ] Home map loads with Streeterville view and visible CTA train markers
- [ ] Sidebar navigation transitions between all pages without blank screens
- [ ] Transit page shows live L train positions and at least one line's status
- [ ] Food page loads OSM restaurant pins and filter buttons work
- [ ] Sports page shows current scores or "next game" for at least 2 teams
- [ ] Events page loads Ticketmaster listings with working filter tabs
- [ ] Weather page shows current conditions tiles and the animated lake scene
- [ ] Neighborhoods AI advisor responds with streaming text (not a spinner forever)
- [ ] Explore page AI chat responds correctly
- [ ] My Chicago: saving a favorite persists after a page refresh
- [ ] My Chicago: marking a place as "been there" persists after a page refresh
- [ ] Beach page loads swim advisories
- [ ] Test on Safari iOS (the primary mobile browser for Chicago users)
- [ ] Test on a throttled "Slow 3G" connection in Chrome DevTools — nothing should fully break
- [ ] Open browser DevTools Console — zero red errors on every page

---

## 12. Post-Launch

- [ ] Monitor Railway logs for the first 48 hours for 5xx errors
- [ ] Monitor Sentry (or equivalent) for any uncaught exceptions
- [ ] Check UptimeRobot to confirm the backend stays up
- [ ] Share the URL and gather initial feedback from real users
- [ ] Plan the first patch release to address any usability issues reported

---

*Last updated: April 2026*
