// backend/routes/me.js
const router = require('express').Router()
const db = require('../db')

function getUserId(req) {
  return req.headers['x-user-id'] || 'anonymous'
}

// GET /api/me — full profile
router.get('/', (req, res) => {
  const userId = getUserId(req)
  const favorites = db.prepare('SELECT * FROM me_favorites WHERE user_id = ? ORDER BY added_at DESC').all(userId)
  const visited   = db.prepare('SELECT * FROM me_visited   WHERE user_id = ? ORDER BY visited_at DESC').all(userId)
  const bucket    = db.prepare('SELECT * FROM me_bucket    WHERE user_id = ? ORDER BY added_at DESC').all(userId)
  res.json({ userId, favorites, visited, bucket })
})

// POST /api/me/favorites
router.post('/favorites', (req, res) => {
  const userId = getUserId(req)
  const { place_id, place_name, lat, lon } = req.body
  if (!place_id || !place_name) return res.status(400).json({ error: 'place_id and place_name required' })
  try {
    db.prepare('INSERT OR IGNORE INTO me_favorites (user_id, place_id, place_name, lat, lon) VALUES (?,?,?,?,?)').run(userId, place_id, place_name, lat || null, lon || null)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/me/favorites/:place_id
router.delete('/favorites/:place_id', (req, res) => {
  const userId = getUserId(req)
  db.prepare('DELETE FROM me_favorites WHERE user_id = ? AND place_id = ?').run(userId, req.params.place_id)
  res.json({ ok: true })
})

// POST /api/me/visited
router.post('/visited', (req, res) => {
  const userId = getUserId(req)
  const { place_id, place_name } = req.body
  if (!place_id || !place_name) return res.status(400).json({ error: 'place_id and place_name required' })
  try {
    db.prepare('INSERT OR IGNORE INTO me_visited (user_id, place_id, place_name) VALUES (?,?,?)').run(userId, place_id, place_name)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/me/visited/:place_id/notes
router.put('/visited/:place_id/notes', (req, res) => {
  const userId = getUserId(req)
  const { notes } = req.body
  db.prepare('UPDATE me_visited SET notes = ? WHERE user_id = ? AND place_id = ?').run(notes ?? '', userId, req.params.place_id)
  res.json({ ok: true })
})

// DELETE /api/me/visited/:place_id
router.delete('/visited/:place_id', (req, res) => {
  const userId = getUserId(req)
  db.prepare('DELETE FROM me_visited WHERE user_id = ? AND place_id = ?').run(userId, req.params.place_id)
  res.json({ ok: true })
})

// POST /api/me/bucket
router.post('/bucket', (req, res) => {
  const userId = getUserId(req)
  const { item_name, item_type } = req.body
  if (!item_name) return res.status(400).json({ error: 'item_name required' })
  try {
    const result = db.prepare('INSERT INTO me_bucket (user_id, item_name, item_type) VALUES (?,?,?)').run(userId, item_name, item_type || 'place')
    res.json({ ok: true, id: result.lastInsertRowid })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/me/bucket/:id
router.delete('/bucket/:id', (req, res) => {
  const userId = getUserId(req)
  db.prepare('DELETE FROM me_bucket WHERE id = ? AND user_id = ?').run(Number(req.params.id), userId)
  res.json({ ok: true })
})

module.exports = router
