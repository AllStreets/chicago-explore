const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'chicago.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS yelp_cache (
    cache_key TEXT PRIMARY KEY,
    data      TEXT NOT NULL,
    cached_at INTEGER NOT NULL
  )
`)

module.exports = db
