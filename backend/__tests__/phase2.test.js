const request = require('supertest')
const app = require('../server')

describe('Phase 2 routes', () => {
  it('GET /api/home-feed returns object', async () => {
    const res = await request(app).get('/api/home-feed')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('nextEvent')
  })

  it('GET /api/neighborhoods returns array', async () => {
    const res = await request(app).get('/api/neighborhoods')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(res.body[0]).toHaveProperty('name')
  })

  it('GET /api/neighborhoods/:id returns neighborhood', async () => {
    const res = await request(app).get('/api/neighborhoods/streeterville')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Streeterville')
  })

  it('GET /api/neighborhoods/:id 404 for unknown', async () => {
    const res = await request(app).get('/api/neighborhoods/fakeneighborhood')
    expect(res.status).toBe(404)
  })

  it('GET /api/sports returns array', async () => {
    const res = await request(app).get('/api/sports')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  }, 10000)

  it('GET /api/events returns array (fallback)', async () => {
    const res = await request(app).get('/api/events')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0]).toHaveProperty('name')
  })

  it('GET /api/me returns profile', async () => {
    const res = await request(app).get('/api/me').set('x-user-id', 'test-user-123')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('favorites')
    expect(res.body).toHaveProperty('visited')
    expect(res.body).toHaveProperty('bucket')
  })

  it('POST /api/me/favorites adds favorite', async () => {
    const res = await request(app)
      .post('/api/me/favorites')
      .set('x-user-id', 'test-user-123')
      .send({ place_id: 'test-place-1', place_name: 'Lou Malnatis', lat: 41.89, lon: -87.63 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('POST /api/me/visited adds visited', async () => {
    const res = await request(app)
      .post('/api/me/visited')
      .set('x-user-id', 'test-user-123')
      .send({ place_id: 'test-place-1', place_name: 'Lou Malnatis' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('POST /api/me/bucket adds bucket item', async () => {
    const res = await request(app)
      .post('/api/me/bucket')
      .set('x-user-id', 'test-user-123')
      .send({ item_name: 'Watch Cubs at Wrigley', item_type: 'experience' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('GET /api/neighborhoods/boundaries returns GeoJSON FeatureCollection', async () => {
    const res = await request(app).get('/api/neighborhoods/boundaries')
    expect(res.status).toBe(200)
    expect(res.body.type).toBe('FeatureCollection')
    expect(Array.isArray(res.body.features)).toBe(true)
  }, 15000)

  it('GET /api/neighborhoods/boundaries features have required properties', async () => {
    const res = await request(app).get('/api/neighborhoods/boundaries')
    expect(res.status).toBe(200)
    if (res.body.features.length > 0) {
      const f = res.body.features[0]
      expect(f.properties).toHaveProperty('id')
      expect(f.properties).toHaveProperty('color')
      expect(f.properties).toHaveProperty('tagline')
      expect(f.properties).toHaveProperty('name')
    }
  }, 15000)
})
