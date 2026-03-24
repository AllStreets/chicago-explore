const { Router } = require('express')
const router = Router()

const INFO_URL   = 'https://gbfs.divvybikes.com/gbfs/en/station_information.json'
const STATUS_URL = 'https://gbfs.divvybikes.com/gbfs/en/station_status.json'

// GET /api/divvy/stations
router.get('/stations', async (_req, res) => {
  try {
    const [infoRes, statusRes] = await Promise.all([fetch(INFO_URL), fetch(STATUS_URL)])
    const [infoData, statusData] = await Promise.all([infoRes.json(), statusRes.json()])

    const infoMap = new Map(
      infoData.data.stations.map(s => [s.station_id, s])
    )

    const stations = statusData.data.stations.map(s => {
      const info = infoMap.get(s.station_id) || {}
      return {
        id:             s.station_id,
        name:           info.name || '',
        lat:            info.lat,
        lon:            info.lon,
        capacity:       info.capacity,
        bikesAvailable: s.num_bikes_available,
        docksAvailable: s.num_docks_available,
        isRenting:      s.is_renting === 1,
      }
    })

    res.json({ stations })
  } catch (e) {
    res.status(502).json({ error: 'Divvy unavailable', detail: e.message })
  }
})

module.exports = router
