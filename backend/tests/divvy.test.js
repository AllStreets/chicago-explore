const request = require('supertest')
const app = require('../server')

global.fetch = jest.fn()
beforeEach(() => fetch.mockClear())

describe('GET /api/divvy/stations', () => {
  it('merges station info and status into a combined array', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { stations: [{ station_id: 's1', name: 'Michigan Ave', lat: 41.88, lon: -87.62, capacity: 15 }] }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { stations: [{ station_id: 's1', num_bikes_available: 7, num_docks_available: 8, is_renting: 1 }] }
        })
      })

    const res = await request(app).get('/api/divvy/stations')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.stations)).toBe(true)
    expect(res.body.stations[0]).toMatchObject({
      id: 's1', name: 'Michigan Ave', bikesAvailable: 7, docksAvailable: 8, isRenting: true
    })
  })
})
