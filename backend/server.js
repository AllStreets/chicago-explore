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

app.use('/api/cta',     require('./routes/cta'))
app.use('/api/weather', require('./routes/weather'))
app.use('/api/lake',    require('./routes/lake'))
app.use('/api/places',  require('./routes/yelp'))
app.use('/api/divvy',   require('./routes/divvy'))

if (require.main === module) {
  const port = process.env.PORT || 3001
  app.listen(port, () => console.log(`Backend on :${port}`))
}

module.exports = app
