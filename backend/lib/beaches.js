// backend/lib/beaches.js — shared beach constants used by beach.js and tonight.js

const BEACHES = [
  { id: 'oak',      name: 'Oak Street Beach',    lat: 41.9024, lon: -87.6244 },
  { id: 'north',    name: 'North Avenue Beach',   lat: 41.9168, lon: -87.6351 },
  { id: '31st',     name: '31st Street Beach',    lat: 41.8379, lon: -87.6158 },
  { id: 'montrose', name: 'Montrose Beach',       lat: 41.9694, lon: -87.6381 },
]

function swimAdvisory(tempC, windMps, desc) {
  if (desc.includes('thunder') || desc.includes('storm')) return { label: 'Closed — Lightning', color: '#ef4444', score: 0 }
  if (windMps > 14)  return { label: 'High Waves — Caution', color: '#ef4444', score: 20 }
  if (tempC < 8)     return { label: 'Too Cold', color: '#8b5cf6', score: 10 }
  if (desc.includes('rain')) return { label: 'Rain', color: '#64748b', score: 30 }
  if (tempC >= 22 && windMps < 8) return { label: 'Ideal', color: '#10b981', score: 95 }
  if (tempC >= 16)   return { label: 'Good', color: '#00d4ff', score: 75 }
  if (tempC >= 10)   return { label: 'Chilly', color: '#eab308', score: 45 }
  return { label: 'Cold', color: '#f97316', score: 25 }
}

module.exports = { BEACHES, swimAdvisory }
