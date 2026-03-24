// backend/routes/events.js
const router = require('express').Router()

function getFallbackEvents() {
  const now = Date.now()
  return [
    { id: '1', name: 'Live Jazz at Green Mill', date: new Date(now + 86400000).toISOString(), venue: 'Green Mill Cocktail Lounge', neighborhood: 'Uptown', type: 'music', price: '$10 cover' },
    { id: '2', name: 'Art Opening — Chicago Art Institute', date: new Date(now + 2 * 86400000).toISOString(), venue: 'Art Institute of Chicago', neighborhood: 'Loop', type: 'art', price: 'Free' },
    { id: '3', name: 'Farmers Market — Green City Market', date: new Date(now + 3 * 86400000).toISOString(), venue: 'Lincoln Park', neighborhood: 'Lincoln Park', type: 'market', price: 'Free' },
    { id: '4', name: 'Comedy Show — Second City', date: new Date(now + 4 * 86400000).toISOString(), venue: 'Second City', neighborhood: 'Old Town', type: 'comedy', price: '$25–40' },
    { id: '5', name: 'Rooftop Cinema — Museum of Science', date: new Date(now + 5 * 86400000).toISOString(), venue: 'Museum of Science and Industry', neighborhood: 'Hyde Park', type: 'film', price: '$18' },
    { id: '6', name: 'Chicago Blues Festival', date: new Date(now + 7 * 86400000).toISOString(), venue: 'Millennium Park', neighborhood: 'Loop', type: 'festival', price: 'Free' },
  ]
}

router.get('/', async (req, res) => {
  const key = process.env.TICKETMASTER_KEY
  if (!key) {
    return res.json(getFallbackEvents())
  }
  try {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=Chicago&stateCode=IL&size=20&sort=date%2Casc&apikey=${key}`
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) throw new Error(`Ticketmaster ${r.status}`)
    const json = await r.json()
    const events = (json?._embedded?.events || []).map(e => ({
      id: e.id,
      name: e.name,
      date: e.dates?.start?.dateTime || e.dates?.start?.localDate,
      venue: e._embedded?.venues?.[0]?.name || '',
      neighborhood: e._embedded?.venues?.[0]?.city?.name || 'Chicago',
      type: e.classifications?.[0]?.genre?.name?.toLowerCase() || 'event',
      price: e.priceRanges ? `$${e.priceRanges[0].min}–${e.priceRanges[0].max}` : 'See site',
      url: e.url
    }))
    res.json(events.length ? events : getFallbackEvents())
  } catch {
    res.json(getFallbackEvents())
  }
})

module.exports = router
