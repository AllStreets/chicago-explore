# Chicago Explorer

A public city intelligence app for exploring Chicago. Built for someone moving to Streeterville (one block from Navy Pier) in late May 2026. Shows live CTA L train positions, a Yelp-powered food and drink map, current weather, and a floating intel feed with lake conditions and transit arrivals.

Repo: https://github.com/AllStreets/chicago-explore

---

## Phase 1 Pages

| Route | Page | Description |
|---|---|---|
| `/` | Home | Full-screen 3D Mapbox map centered on Streeterville, live CTA train dots, floating IntelFeed overlay (weather, lake conditions, CTA arrivals) |
| `/transit` | Transit | All 8 CTA L lines with live train positions and Divvy bike stations on map, line status sidebar |
| `/food` | Food & Drink | Yelp-powered restaurant map, cuisine filter buttons, open-now toggle, place cards |

---

## Tech Stack

**Frontend**
- React 19, Vite 8, React Router v7
- Mapbox GL JS
- react-icons/ri (Remix Icons)
- Testing: Vitest + React Testing Library (25 tests, 8 files)

**Backend**
- Express 5, Node.js 18+
- better-sqlite3 (SQLite — used to cache Yelp results)
- Testing: Jest + Supertest (11 tests, 5 suites)

**Design**
- Background: `#060b18`, Accent: `#00d4ff`
- Fonts: Space Grotesk (UI), JetBrains Mono (numbers/code)

---

## Local Development

### 1. Clone the repo

```bash
git clone https://github.com/AllStreets/chicago-explore.git
cd chicago-explore
```

### 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in real API keys
node server.js
```

Backend runs at http://localhost:3001.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173.

Both must be running at the same time for the app to work locally.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `CTA_API_KEY` | Yes | CTA Train Tracker API key — get free at transitchicago.com |
| `YELP_API_KEY` | Yes | Yelp Fusion API key — get free at yelp.com/developers (500 req/day) |
| `OPENWEATHER_API_KEY` | Yes | OpenWeatherMap API key — free tier at openweathermap.org |
| `TICKETMASTER_API_KEY` | No | Ticketmaster Discovery API — used in Phase 2 Events page |
| `ANTHROPIC_API_KEY` | No | Anthropic Claude API — used in Phase 2 AI features |
| `FRONTEND_URL` | Yes | Full URL of the deployed frontend, e.g. `https://your-app.vercel.app` (used for CORS) |
| `PORT` | No | Port to listen on — defaults to `3001` |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox public access token — get at mapbox.com (pay-as-you-go) |
| `VITE_API_URL` | Yes | Full URL of the deployed backend, e.g. `https://your-api.railway.app` |

---

## Testing

### Backend

```bash
cd backend
npm test
```

Runs 11 tests across 5 suites (cta, divvy, weather, yelp, server) using Jest + Supertest.

### Frontend

```bash
cd frontend
npx vitest run
```

Runs 25 tests across 8 files using Vitest + React Testing Library.

---

## Phase 2 (Coming)

The following pages are stubbed and will be built out:

- **Neighborhoods** — character, demographics, and vibe per Chicago neighborhood
- **Nightlife** — bars, live music, clubs with Yelp + hours data
- **Sports** — Cubs, Sox, Bulls, Bears, Blackhawks schedules and venues
- **Events** — Ticketmaster-powered event listings on a map
- **Explore** — curated spots and hidden gems
- **Weather & Lake** — detailed forecast and Lake Michigan conditions
- **My Chicago** — saved places and personal notes
