const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'chicago.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS yelp_cache (
    cache_key TEXT PRIMARY KEY,
    data      TEXT NOT NULL,
    cached_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS me_favorites (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT NOT NULL,
    place_id  TEXT NOT NULL,
    place_name TEXT NOT NULL,
    lat       REAL,
    lon       REAL,
    added_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    UNIQUE(user_id, place_id)
  );
  CREATE TABLE IF NOT EXISTS me_visited (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT NOT NULL,
    place_id  TEXT NOT NULL,
    place_name TEXT NOT NULL,
    visited_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    UNIQUE(user_id, place_id)
  );
  CREATE TABLE IF NOT EXISTS me_bucket (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'place',
    added_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  )
`)

module.exports = db
