const request = require('supertest')
const app = require('../server')

global.fetch = jest.fn()
beforeEach(() => fetch.mockClear())

const OWM_RESPONSE = {
  main: { temp: 285, feels_like: 282, humidity: 65 },
  wind: { speed: 5.2, deg: 270 },
  weather: [{ description: 'partly cloudy', icon: '02d' }],
  name: 'Chicago'
}

describe('GET /api/weather', () => {
  it('returns current conditions', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => OWM_RESPONSE })
    const res = await request(app).get('/api/weather')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('temp')
    expect(res.body).toHaveProperty('wind')
    expect(res.body).toHaveProperty('description')
  })
})

describe('GET /api/lake', () => {
  it('returns a lake conditions object with a niceness score', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => OWM_RESPONSE })
    const res = await request(app).get('/api/lake')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('niceScore')
    expect(typeof res.body.niceScore).toBe('number')
    expect(res.body.niceScore).toBeGreaterThanOrEqual(0)
    expect(res.body.niceScore).toBeLessThanOrEqual(100)
  })

  it('returns niceLabel string', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => OWM_RESPONSE })
    const res = await request(app).get('/api/lake')
    expect(res.body).toHaveProperty('niceLabel')
    expect(typeof res.body.niceLabel).toBe('string')
  })
})
