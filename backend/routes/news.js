const { Router } = require('express')
const db = require('../db')
const router = Router()

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const TTL_MS = 15 * 60 * 1000 // 15 minutes
const CACHE_KEY = 'news_feed_v3'

const FEEDS = [
  {
    url: 'https://blockclubchicago.org/feed/',
    fallback: 'https://chicago.suntimes.com/rss/index.xml',
    source: 'Block Club Chicago',
    tab: 'chicago',
  },
  {
    url: 'https://chicago.suntimes.com/rss/index.xml',
    fallback: 'https://wgntv.com/news/chicago-news/feed/',
    source: 'Chicago Sun-Times',
    tab: 'chicago',
  },
  {
    url: 'https://feeds.npr.org/1001/rss.xml',
    fallback: 'https://feeds.abcnews.com/abcnews/topstories',
    source: 'NPR News',
    tab: 'national',
  },
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    fallback: 'https://feeds.skynews.com/feeds/rss/world.xml',
    source: 'BBC News',
    tab: 'world',
  },
]

function stripCdata(text) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8218;/g, '\u201a')
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(text) {
  return decodeEntities(text.replace(/<[^>]+>/g, '')).trim()
}

function extractField(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!m) return ''
  return stripCdata(m[1]).trim()
}

function parseRss(xml, source, tab) {
  const items = []
  const itemRegex = /(<item[\s\S]*?<\/item>)/g
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
    const block = match[1]
    const title = stripHtml(extractField(block, 'title'))
    let description = stripHtml(extractField(block, 'description'))
    if (description.length > 200) description = description.slice(0, 200) + '...'
    const link = extractField(block, 'link') || extractField(block, 'guid')
    const pubDate = extractField(block, 'pubDate') || extractField(block, 'dc:date') || ''
    if (!title) continue
    items.push({ title, description, link, pubDate, source, tab })
  }
  return items
}

async function fetchFeed(feedCfg) {
  const tryUrl = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    return parseRss(xml, feedCfg.source, feedCfg.tab)
  }

  try {
    return await tryUrl(feedCfg.url)
  } catch (err) {
    if (feedCfg.fallback) {
      try {
        return await tryUrl(feedCfg.fallback)
      } catch {
        return []
      }
    }
    return []
  }
}

function sortByDate(articles) {
  return articles.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const db2 = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return db2 - da
  })
}

router.get('/', async (req, res) => {
  try {
    const cached = stmtGet.get(CACHE_KEY)
    if (cached && Date.now() - cached.cached_at < TTL_MS) {
      return res.json(JSON.parse(cached.data))
    }

    const results = await Promise.allSettled(FEEDS.map(fetchFeed))

    const chicago = []
    const national = []
    const world = []

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        result.value.forEach((article) => {
          if (article.tab === 'chicago') chicago.push(article)
          else if (article.tab === 'national') national.push(article)
          else if (article.tab === 'world') world.push(article)
        })
      }
    })

    const payload = {
      chicago: sortByDate(chicago),
      national: sortByDate(national),
      world: sortByDate(world),
    }

    stmtSet.run(CACHE_KEY, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch {
    res.json({ chicago: [], national: [], world: [] })
  }
})

module.exports = router
