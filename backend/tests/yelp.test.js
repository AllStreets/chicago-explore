const request = require('supertest')
const app = require('../server')
const db = require('../db')

global.fetch = jest.fn()
beforeEach(() => {
  fetch.mockClear()
  db.prepare('DELETE FROM yelp_cache').run()
})

describe('GET /api/places', () => {
  it('returns places array from Overpass', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { id: 12345, type: 'node', lat: 41.88, lon: -87.62, tags: { name: 'The Gage', amenity: 'restaurant', cuisine: 'american' } }
        ]
      })
    })
    const res = await request(app).get('/api/places?type=restaurants')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.places)).toBe(true)
    expect(res.body.places[0]).toMatchObject({ id: '12345', name: 'The Gage' })
  })

  it('serves from SQLite cache on second identical request', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [{ id: 99, type: 'node', lat: 41.88, lon: -87.62, tags: { name: 'Cached Place', amenity: 'bar' } }]
      })
    })
    await request(app).get('/api/places?type=bars')
    const res = await request(app).get('/api/places?type=bars')
    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('filters out elements without a name', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, type: 'node', lat: 41.88, lon: -87.62, tags: { amenity: 'restaurant' } },  // no name
          { id: 2, type: 'node', lat: 41.89, lon: -87.63, tags: { name: 'Named Place', amenity: 'restaurant' } }
        ]
      })
    })
    const res = await request(app).get('/api/places?type=restaurants')
    expect(res.status).toBe(200)
    expect(res.body.places.length).toBe(1)
    expect(res.body.places[0].name).toBe('Named Place')
  })
})
