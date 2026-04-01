require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  /\.vercel\.app$/,
]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    const allowed = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    )
    cb(allowed ? null : new Error('Not allowed by CORS'), allowed)
  }
}))

app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/cta',           require('./routes/cta'))
app.use('/api/weather',       require('./routes/weather'))
app.use('/api/lake',          require('./routes/lake'))
app.use('/api/places',        require('./routes/yelp'))
app.use('/api/divvy',         require('./routes/divvy'))
app.use('/api/home-feed',     require('./routes/home-feed'))
app.use('/api/neighborhoods', require('./routes/neighborhoods'))
app.use('/api/sports',        require('./routes/sports'))
app.use('/api/events',        require('./routes/events'))
app.use('/api/ai',            require('./routes/ai'))
app.use('/api/me',            require('./routes/me'))
app.use('/api/tonight',       require('./routes/tonight'))
app.use('/api/beach',         require('./routes/beach'))
app.use('/api/311',           require('./routes/reports311'))
app.use('/api/push',          require('./routes/push'))
app.use('/api/finance',       require('./routes/finance'))
app.use('/api/news',          require('./routes/news'))
app.use('/api/health-places', require('./routes/health'))

if (require.main === module) {
  const port = process.env.PORT || 3001
  app.listen(port, () => console.log(`Backend on :${port}`))
}

module.exports = app
