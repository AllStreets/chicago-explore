const request = require('supertest')
const app = require('../server')

// Mock fetch so tests don't hit the real CTA API
global.fetch = jest.fn()

beforeEach(() => fetch.mockClear())

describe('GET /api/cta/trains', () => {
  it('returns 200 with a trains array when CTA responds', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ctatt: {
          train: [
            { rn: '101', lat: '41.87', lon: '-87.63', heading: '90', rt: 'Red', nextStaNm: 'Grand', prdt: '20260323 12:00:00', arrT: '20260323 12:02:00' }
          ]
        }
      })
    })

    const res = await request(app).get('/api/cta/trains')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.trains)).toBe(true)
    expect(res.body.trains[0]).toMatchObject({ rn: '101', lat: 41.87, lon: -87.63, line: 'Red' })
  })

  it('returns 200 with empty array when CTA has no trains', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ctatt: {} })
    })

    const res = await request(app).get('/api/cta/trains')
    expect(res.status).toBe(200)
    expect(res.body.trains).toEqual([])
  })
})

describe('GET /api/cta/arrivals', () => {
  it('requires a stop query param', async () => {
    const res = await request(app).get('/api/cta/arrivals')
    expect(res.status).toBe(400)
  })

  it('returns arrivals array for a valid stop', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ctatt: {
          eta: [
            { staNm: 'Grand', rt: 'Red', arrT: '20260323 12:02:00', isApp: '0', isDly: '0' }
          ]
        }
      })
    })

    const res = await request(app).get('/api/cta/arrivals?stop=40490')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.arrivals)).toBe(true)
    expect(res.body.arrivals[0]).toMatchObject({ station: 'Grand', line: 'Red' })
  })
})
