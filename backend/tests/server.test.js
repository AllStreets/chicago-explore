const request = require('supertest')
const app = require('../server')

describe('server health', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
  })
})
