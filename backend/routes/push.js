// backend/routes/push.js
const router = require('express').Router()
const db = require('../db')

// Lazy-load web-push only if keys are configured
function getWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL
  if (!pub || !priv || !email) return null
  const webpush = require('web-push')
  webpush.setVapidDetails(`mailto:${email}`, pub, priv)
  return webpush
}

// Store subscriptions
try {
  db.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    keys TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  )`)
} catch {}

// GET /api/push/vapid-key — public key for frontend subscription
router.get('/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY
  res.json({ key: key || null })
})

// POST /api/push/subscribe — save subscription
router.post('/subscribe', (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys) return res.status(400).json({ error: 'endpoint and keys required' })
  try {
    db.prepare('INSERT OR REPLACE INTO push_subscriptions (endpoint, keys) VALUES (?, ?)').run(endpoint, JSON.stringify(keys))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/push/send — send notification
router.post('/send', async (req, res) => {
  const webpush = getWebPush()
  if (!webpush) return res.status(503).json({ error: 'VAPID keys not configured' })
  const { title, body } = req.body
  const subs = db.prepare('SELECT * FROM push_subscriptions').all()
  const payload = JSON.stringify({ title, body })
  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: JSON.parse(sub.keys) }, payload)
      sent++
    } catch { /* expired subscription */ }
  }
  res.json({ sent })
})

module.exports = router
