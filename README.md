# Chicago Explorer

A city intelligence app for exploring Chicago. Built for someone moving to Streeterville (one block from Navy Pier) in late May 2026.

**Live:** [chicago-explorer.vercel.app](https://chicago-explorer.vercel.app) — **API:** [railway.app](https://railway.app)

Repo: https://github.com/AllStreets/chicago-explore

---

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Home | 3D Mapbox map centered on Streeterville — live CTA train dots, official team logo stadium pins (Bulls/Bears sort on top), food and nightlife icons, floating IntelFeed (weather, sports scores, tonight's event, closest train, Buzzing Now) |
| `/explore` | Explore Chicago | Curated landmarks by category (architecture, culture, nature, hidden) with AI guide chat |
| `/transit` | Transit | All 8 CTA L lines with animated live train positions, line status sidebar, Divvy stations |
| `/nightlife` | Nightlife | Bars, night clubs, cocktail bars, rooftop bars, wine bars, jazz venues — Mapbox map + 7 neighborhood scene profiles including Streeterville |
| `/food` | Food & Drink | OSM-powered restaurant map with cuisine filters (restaurants, bars, cafes, pizza, sushi, tacos, brunch) |
| `/sports` | Sports | Cubs, Sox, Bears, Bulls, Blackhawks, Fire — live scores (refreshes every 90s), today's games, upcoming schedule |
| `/events` | Events | Ticketmaster-powered event listings, color-coded by type with filter tabs |
| `/weather` | Weather & Lake | Current conditions, HIGH/NOW/LOW tiles, animated Lake Michigan scene (8 weather states) |
| `/neighborhoods` | Neighborhoods | Per-neighborhood character, stats, vibe tags, AI brief, and AI live-in advisor |
| `/me` | My Chicago | Saved favorites and been-there places from Food, Nightlife, and Explore pages |

---

## Tech Stack

**Frontend**
- React 19, Vite, React Router v7
- Mapbox GL JS (maps on Home, Transit, Food, Nightlife)
- react-icons/ri (Remix Icons — no emojis)
- Vitest + React Testing Library

**Backend**
- Express 5, Node.js 18+
- better-sqlite3 (SQLite — caches API responses, stores user favorites/visited)
- Jest + Supertest

**Design**
- Background: `#060b18` · Accent: `#00d4ff`
- Fonts: Space Grotesk (UI), JetBrains Mono (numbers/code)

**External APIs**
| API | Used For | Key Required |
|---|---|---|
| OpenWeatherMap | Current weather + lake conditions | Yes |
| CTA Train Tracker | Live L train positions | Yes |
| OpenStreetMap / Overpass | Food, drink, and nightlife places | No |
| Ticketmaster Discovery | Events listings | Yes |
| ESPN (public scoreboard) | Sports scores + schedules | No |
| Mapbox | Maps | 50k loads/mo free |
| OpenAI | AI streaming (Explore, Neighborhoods) | Yes (pay per token) |

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/AllStreets/chicago-explore.git
cd chicago-explore
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in keys (see Environment Variables below)
node server.js
```

Runs at `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`. Both must be running simultaneously.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENWEATHER_KEY` | Yes | OpenWeatherMap API key — [openweathermap.org](https://openweathermap.org) |
| `OPENWEATHER_API_KEY` | Yes | Same key as above (used by two routes) |
| `OPENAI_API_KEY` | Yes | OpenAI API key — [platform.openai.com](https://platform.openai.com) — powers AI streaming |
| `TICKETMASTER_KEY` | Yes | Ticketmaster Discovery API — [developer.ticketmaster.com](https://developer.ticketmaster.com) |
| `CTA_API_KEY` | Yes | CTA Train Tracker — [transitchicago.com/developers](https://www.transitchicago.com/developers/) |
| `FRONTEND_URL` | Yes | Your Vercel URL — used for CORS, e.g. `https://your-app.vercel.app` |
| `PORT` | No | Do not set — Railway injects this automatically |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_MAPBOX_TOKEN` | Yes | Mapbox public token — [mapbox.com](https://mapbox.com) |
| `VITE_API_URL` | Yes | Your Railway backend URL, e.g. `https://your-api.railway.app` |

Without API keys the app degrades gracefully — maps show a placeholder, data sections show "add key to enable".

---

## Testing

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npx vitest run
```

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full Railway + Vercel setup guide with step-by-step instructions.
