import { RiMapPinLine } from 'react-icons/ri'

export default function MapPlaceholder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', minHeight: 300, background: '#0a1628',
      border: '1px dashed #1e3a5f', borderRadius: 8, gap: 10, color: '#475569'
    }}>
      <RiMapPinLine style={{ fontSize: 32, color: '#1e3a5f' }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>Map requires VITE_MAPBOX_TOKEN</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#334155' }}>Add token to frontend/.env to enable</div>
    </div>
  )
}
