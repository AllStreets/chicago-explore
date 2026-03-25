/**
 * makeMapPin(shape, color) — crisp 2× HiDPI Mapbox icon
 *
 * Usage:
 *   map.addImage('my-icon', makeMapPin('fork', '#f59e0b'), { pixelRatio: 2 })
 *
 * The returned object is 56×56 physical pixels but represents a 28×28 logical
 * pin, so icon-size: 1 in the layer definition gives a 28px pin on screen.
 */
export function makeMapPin(shape, color) {
  const LOG = 28          // logical size (what Mapbox sees after pixelRatio scaling)
  const DPR = 2           // pixel ratio — 2× for sharp retina rendering
  const PHY = LOG * DPR   // physical canvas size

  const canvas = document.createElement('canvas')
  canvas.width  = PHY
  canvas.height = PHY
  const ctx = canvas.getContext('2d')
  ctx.scale(DPR, DPR)     // draw everything in logical 28×28 coordinates

  const cx = 14, cy = 14, r = 12.5

  // ── Background circle ───────────────────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  // Subtle inner shadow ring for depth
  const grad = ctx.createRadialGradient(cx, cy - 3, 2, cx, cy, r)
  grad.addColorStop(0,   'rgba(255,255,255,0.18)')
  grad.addColorStop(1,   'rgba(0,0,0,0.18)')
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // White border ring
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // ── Icon ────────────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle   = '#ffffff'
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  switch (shape) {

    case 'fork': {
      // Fork (left) + Knife (right) — bold, centered
      ctx.lineWidth = 1.8

      // Fork — 3 tines
      for (const x of [8.5, 10.5, 12.5]) {
        ctx.beginPath(); ctx.moveTo(x, 5.5); ctx.lineTo(x, 11); ctx.stroke()
      }
      // Tine connector
      ctx.beginPath()
      ctx.moveTo(8.5, 11)
      ctx.quadraticCurveTo(10.5, 13, 12.5, 11)
      ctx.stroke()
      // Fork handle
      ctx.beginPath(); ctx.moveTo(10.5, 13); ctx.lineTo(10.5, 22.5); ctx.stroke()

      // Knife — simple tapered blade + handle
      ctx.beginPath()
      ctx.moveTo(17.5, 5.5)
      ctx.bezierCurveTo(20, 7, 20, 12.5, 17.5, 13.5)
      ctx.lineTo(17.5, 22.5)
      ctx.stroke()
      break
    }

    case 'martini': {
      ctx.lineWidth = 1.8
      // Glass body
      ctx.beginPath()
      ctx.moveTo(6.5, 5.5); ctx.lineTo(14, 15.5); ctx.lineTo(21.5, 5.5)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'; ctx.stroke()
      // Stem
      ctx.beginPath(); ctx.moveTo(14, 15.5); ctx.lineTo(14, 22); ctx.stroke()
      // Base
      ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.moveTo(10, 22); ctx.lineTo(18, 22); ctx.stroke()
      break
    }

    case 'beer': {
      ctx.lineWidth = 1.8
      // Mug body
      ctx.beginPath()
      ctx.moveTo(8, 8); ctx.lineTo(8, 22); ctx.lineTo(18, 22); ctx.lineTo(18, 8)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill()
      ctx.strokeStyle = '#ffffff'; ctx.stroke()
      // Handle
      ctx.beginPath()
      ctx.moveTo(18, 11)
      ctx.bezierCurveTo(23.5, 11, 23.5, 20, 18, 20)
      ctx.stroke()
      // Foam — thick top line
      ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(8.5, 8); ctx.lineTo(17.5, 8); ctx.stroke()
      // Bubble line
      ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(11, 12); ctx.lineTo(11, 15); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(14, 11); ctx.lineTo(14, 14); ctx.stroke()
      break
    }

    case 'wine': {
      ctx.lineWidth = 1.8
      // Bowl
      ctx.beginPath()
      ctx.moveTo(8.5, 5)
      ctx.bezierCurveTo(7.5, 10, 10, 15.5, 14, 16.5)
      ctx.bezierCurveTo(18, 15.5, 20.5, 10, 19.5, 5)
      ctx.stroke()
      ctx.beginPath(); ctx.moveTo(8.5, 5); ctx.lineTo(19.5, 5); ctx.stroke()
      // Stem
      ctx.beginPath(); ctx.moveTo(14, 16.5); ctx.lineTo(14, 23); ctx.stroke()
      // Base
      ctx.lineWidth = 2.2
      ctx.beginPath(); ctx.moveTo(10, 23); ctx.lineTo(18, 23); ctx.stroke()
      break
    }

    case 'music': {
      ctx.lineWidth = 1.8
      // Note head — filled ellipse
      ctx.beginPath()
      ctx.ellipse(10.5, 20, 3.5, 2.5, -0.35, 0, Math.PI * 2)
      ctx.fill()
      // Stem
      ctx.beginPath(); ctx.moveTo(13.8, 19); ctx.lineTo(13.8, 6.5); ctx.stroke()
      // Flag
      ctx.beginPath()
      ctx.moveTo(13.8, 6.5)
      ctx.bezierCurveTo(20, 6, 21.5, 11, 18.5, 13.5)
      ctx.stroke()
      break
    }

    case 'building': {
      // Clean building silhouette
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillRect(7.5, 6, 13, 17)
      // Windows — color-tinted cutouts
      ctx.fillStyle = color
      const windows = [[9,8],[13,8],[9,12],[13,12],[9,16],[13,16]]
      for (const [wx, wy] of windows) {
        ctx.fillRect(wx, wy, 2.5, 2.5)
      }
      // Door
      ctx.fillRect(12, 20, 3, 3)
      break
    }

    case 'whiskey': {
      // Rocks / old-fashioned tumbler — short wide glass with liquid and ice cube
      ctx.lineWidth = 1.8
      // Glass body — trapezoid shape (wider at top)
      ctx.beginPath()
      ctx.moveTo(7,  8)   // top-left
      ctx.lineTo(21, 8)   // top-right
      ctx.lineTo(19, 23)  // bottom-right
      ctx.lineTo(9,  23)  // bottom-left
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
      // Liquid fill (amber tint)
      ctx.beginPath()
      ctx.moveTo(8.2,  14)
      ctx.lineTo(19.8, 14)
      ctx.lineTo(19,   23)
      ctx.lineTo(9,    23)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fill()
      // Ice cube
      ctx.lineWidth = 1.4
      ctx.strokeRect(10.5, 15.5, 5, 4.5)
      break
    }

    case 'dancer': {
      ctx.lineWidth = 2.4

      // === Left dancer ===
      // Head
      ctx.beginPath(); ctx.arc(9, 5.5, 2, 0, Math.PI * 2); ctx.fill()
      // Torso — filled trapezoid (shoulders wider than hips)
      ctx.beginPath()
      ctx.moveTo(6.8, 7.5); ctx.lineTo(11.2, 7.5)
      ctx.lineTo(10.4, 13); ctx.lineTo(7.6, 13)
      ctx.closePath(); ctx.fill()
      // Left arm — raised up-left
      ctx.beginPath(); ctx.moveTo(7.2, 9); ctx.lineTo(3.5, 6); ctx.stroke()
      // Right arm — reaching toward center
      ctx.beginPath(); ctx.moveTo(10.8, 9); ctx.lineTo(14.5, 10.5); ctx.stroke()
      // Left leg — straight down
      ctx.beginPath(); ctx.moveTo(7.8, 13); ctx.lineTo(5.5, 22); ctx.stroke()
      // Right leg — kicked out
      ctx.beginPath(); ctx.moveTo(10.2, 13); ctx.lineTo(12.5, 20.5); ctx.stroke()

      // === Right dancer — mirrored ===
      // Head
      ctx.beginPath(); ctx.arc(19, 5.5, 2, 0, Math.PI * 2); ctx.fill()
      // Torso
      ctx.beginPath()
      ctx.moveTo(16.8, 7.5); ctx.lineTo(21.2, 7.5)
      ctx.lineTo(20.4, 13); ctx.lineTo(17.6, 13)
      ctx.closePath(); ctx.fill()
      // Left arm — reaching toward center
      ctx.beginPath(); ctx.moveTo(17.2, 9); ctx.lineTo(13.5, 10.5); ctx.stroke()
      // Right arm — raised up-right
      ctx.beginPath(); ctx.moveTo(20.8, 9); ctx.lineTo(24.5, 6); ctx.stroke()
      // Left leg — kicked out
      ctx.beginPath(); ctx.moveTo(17.8, 13); ctx.lineTo(15.5, 20.5); ctx.stroke()
      // Right leg — straight down
      ctx.beginPath(); ctx.moveTo(20.2, 13); ctx.lineTo(22.5, 22); ctx.stroke()

      break
    }

    default: {
      // Fallback: bold dot
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill()
    }
  }

  const img = ctx.getImageData(0, 0, PHY, PHY)
  return { width: PHY, height: PHY, data: img.data }
}
