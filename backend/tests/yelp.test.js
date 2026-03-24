const request = require('supertest')
const app = require('../server')
const db = require('../db')

global.fetch = jest.fn()
beforeEach(() => {
  fetch.mockClear()
  db.prepare('DELETE FROM yelp_cache').run()
})

describe('GET /api/places', () => {
  it('returns businesses array from Yelp', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        businesses: [
          { id: 'abc', name: 'The Gage', categories: [{ title: 'American' }], rating: 4.2, price: '$$', location: { neighborhood: 'Loop' }, coordinates: { latitude: 41.88, longitude: -87.62 } }
        ]
      })
    })
    const res = await request(app).get('/api/places?type=restaurants&neighborhood=Loop')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.places)).toBe(true)
    expect(res.body.places[0]).toMatchObject({ id: 'abc', name: 'The Gage' })
  })

  it('serves from SQLite cache on second identical request', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        businesses: [{ id: 'xyz', name: 'Cached Place', categories: [], rating: 4.0, price: '$', location: {}, coordinates: { latitude: 41.88, longitude: -87.62 } }]
      })
    })

    // First request — hits Yelp
    await request(app).get('/api/places?type=bars')
    // Second request — should use cache, not call fetch again
    const res = await request(app).get('/api/places?type=bars')
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)  // only one real fetch
  })
})
