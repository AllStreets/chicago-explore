import { useEffect, useState, useRef } from 'react'
import { RiMapPinLine, RiWalkLine, RiSubwayLine, RiHomeSmileLine, RiBrainLine } from 'react-icons/ri'
import './NeighborhoodsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useNeighborhoods() {
  const [hoods, setHoods] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`${API}/api/neighborhoods`)
      .then(r => r.json())
      .then(d => setHoods(Array.isArray(d) ? d : []))
      .catch(() => setHoods([]))
      .finally(() => setLoading(false))
  }, [])
  return { hoods, loading }
}

function useAIBrief(neighborhood) {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef(null)

  async function fetchBrief() {
    if (!neighborhood) return
    setText('')
    setStreaming(true)
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${API}/api/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Give me a short, honest, personal briefing on living in or visiting ${neighborhood.name} in Chicago. Focus on: what makes it special, who lives there, best time to visit, one hidden gem. 3–4 sentences max.`,
          context: 'neighborhood'
        }),
        signal: controller.signal
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { setStreaming(false); return }
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) setText(prev => prev + parsed.text)
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setText('AI brief unavailable — add ANTHROPIC_API_KEY to enable.')
      }
    } finally {
      setStreaming(false)
    }
  }

  return { text, streaming, fetchBrief }
}

const VIBE_COLORS = {
  upscale: '#00d4ff', lakefront: '#3b82f6', walkable: '#10b981',
  artsy: '#8b5cf6', indie: '#a78bfa', nightlife: '#f97316',
  green: '#10b981', family: '#eab308', 'bar scene': '#f97316',
  hipster: '#8b5cf6', foodie: '#f97316', diverse: '#10b981',
  professional: '#3b82f6', museums: '#00d4ff', mixed: '#64748b',
  residential: '#64748b', community: '#10b981', inclusive: '#ec4899',
  artistic: '#8b5cf6', cultural: '#f97316', authentic: '#eab308',
  academic: '#3b82f6', historic: '#92400e', quiet: '#64748b',
  entertainment: '#f97316', tech: '#00d4ff', trendy: '#f97316',
}

export default function NeighborhoodsPage() {
  const { hoods, loading } = useNeighborhoods()
  const [selected, setSelected] = useState(null)
  const { text: aiText, streaming, fetchBrief } = useAIBrief(selected)

  function select(hood) {
    setSelected(hood)
  }

  return (
    <div className="neighborhoods-page">
      <div className="neighborhoods-header">
        <span className="neighborhoods-title">Neighborhoods</span>
        <span className="neighborhoods-sub">Chicago from Streeterville outward</span>
      </div>

      {loading && <div className="neighborhoods-loading">Loading...</div>}

      <div className="neighborhoods-layout">
        <div className="neighborhoods-list">
          {hoods.map(h => (
            <div
              key={h.id}
              className={`neighborhood-card${selected?.id === h.id ? ' selected' : ''}`}
              onClick={() => select(h)}
            >
              <div className="neighborhood-card-name">{h.name}</div>
              <div className="neighborhood-card-tagline">{h.tagline}</div>
              <div className="neighborhood-card-vibes">
                {(h.vibe || []).map(v => (
                  <span
                    key={v}
                    className="neighborhood-vibe-tag"
                    style={{ '--vibe-color': VIBE_COLORS[v] || '#64748b' }}
                  >{v}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="neighborhoods-detail">
          {!selected && (
            <div className="neighborhoods-placeholder">
              Select a neighborhood to explore
            </div>
          )}
          {selected && (
            <>
              <div className="nd-name">{selected.name}</div>
              <div className="nd-tagline">{selected.tagline}</div>
              <div className="nd-desc">{selected.description}</div>

              <div className="nd-stats">
                <div className="nd-stat">
                  <RiWalkLine />
                  <span>Walk {selected.walkScore}</span>
                </div>
                <div className="nd-stat">
                  <RiSubwayLine />
                  <span>Transit {selected.transitScore}</span>
                </div>
                <div className="nd-stat">
                  <RiHomeSmileLine />
                  <span>~${selected.avgRent?.toLocaleString()}/mo</span>
                </div>
                <div className="nd-stat">
                  <RiMapPinLine />
                  <span>{selected.commute}</span>
                </div>
              </div>

              {selected.topSpots?.length > 0 && (
                <div className="nd-spots">
                  <div className="nd-spots-label">TOP SPOTS</div>
                  {selected.topSpots.map(s => (
                    <span key={s} className="nd-spot">{s}</span>
                  ))}
                </div>
              )}

              <div className="nd-ai">
                <div className="nd-ai-label">
                  <RiBrainLine />
                  AI BRIEF
                </div>
                {!aiText && !streaming && (
                  <button className="nd-ai-btn" onClick={fetchBrief}>
                    Generate brief
                  </button>
                )}
                {(aiText || streaming) && (
                  <div className="nd-ai-text">
                    {aiText}
                    {streaming && <span className="nd-ai-cursor">|</span>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
