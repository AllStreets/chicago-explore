const request = require('supertest')
const app = require('../server')
const db = require('../db')

global.fetch = jest.fn()
beforeEach(() => {
  fetch.mockClear()
  db.prepare('DELETE FROM yelp_cache').run()
})

describe('GET /api/places', () => {
  it('returns places array from Foursquare', async () => {
    process.env.FOURSQUARE_KEY = 'test-key'
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            fsq_id: 'abc',
            name: 'The Gage',
            categories: [{ name: 'American Restaurant' }],
            price: 2,
            location: { neighborhood: ['Loop'] },
            geocodes: { main: { latitude: 41.88, longitude: -87.62 } },
            distance: 500,
          }
        ]
      })
    })
    const res = await request(app).get('/api/places?type=restaurants')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.places)).toBe(true)
    expect(res.body.places[0]).toMatchObject({ id: 'abc', name: 'The Gage' })
    delete process.env.FOURSQUARE_KEY
  })

  it('serves from SQLite cache on second identical request', async () => {
    process.env.FOURSQUARE_KEY = 'test-key'
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ fsq_id: 'xyz', name: 'Cached Place', categories: [], location: {}, geocodes: { main: { latitude: 41.88, longitude: -87.62 } }, distance: 200 }]
      })
    })

    // First request — hits Foursquare
    await request(app).get('/api/places?type=bars')
    // Second request — should use cache
    const res = await request(app).get('/api/places?type=bars')
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
    delete process.env.FOURSQUARE_KEY
  })

  it('returns empty places when FOURSQUARE_KEY is not set', async () => {
    delete process.env.FOURSQUARE_KEY
    const res = await request(app).get('/api/places?type=restaurants')
    expect(res.status).toBe(200)
    expect(res.body.places).toEqual([])
  })
})
