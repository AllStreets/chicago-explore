import { useState } from 'react'
import { RiBuildingLine, RiLeafLine, RiAncientGateLine, RiLandscapeLine, RiBrainLine } from 'react-icons/ri'
import './ExplorePage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const LANDMARKS = [
  { name: 'Millennium Park', category: 'icon', desc: 'Cloud Gate (The Bean), Crown Fountain, free concerts. 5 min walk from Streeterville.', tip: 'Best at golden hour or just after rain.' },
  { name: 'Navy Pier', category: 'icon', desc: 'Chicago\'s lakefront playground. Fireworks Wed & Sat in summer. Ferris wheel, restaurants, Chicago Shakespeare Theater.', tip: 'Go on a weekday morning to avoid crowds.' },
  { name: 'Chicago Architecture Center', category: 'architecture', desc: 'Best way to understand the city. Book the Chicago River Architecture Boat Tour — 90 mins, totally worth it.', tip: 'The free center itself has stunning models of every Chicago skyscraper.' },
  { name: 'Art Institute of Chicago', category: 'culture', desc: 'World-class art museum. Don\'t miss the Thorne Miniature Rooms and the Impressionist gallery.', tip: 'Free on Thursdays after 5pm for Illinois residents.' },
  { name: 'Lincoln Park Zoo', category: 'nature', desc: 'Free admission, always. Located in the 1,208-acre Lincoln Park. See the gorilla house and farm-in-the-zoo.', tip: 'Come in the morning when animals are active.' },
  { name: 'The 606 Trail', category: 'nature', desc: 'Elevated rail-to-trail through Wicker Park, Bucktown, Logan Square. 2.7 miles, best view of the city skyline on foot.', tip: 'Rent a Divvy bike and ride the full length.' },
  { name: 'Chicago Riverwalk', category: 'icon', desc: 'Below street level along the Chicago River. Kayak rentals, restaurants, bars, architecture views.', tip: 'Best at sunset when the buildings reflect off the water.' },
  { name: 'Museum of Science & Industry', category: 'culture', desc: 'One of the largest science museums in the world. U-505 submarine, coal mine, weather exhibit.', tip: 'Allow 4+ hours. Worth the trip to Hyde Park.' },
  { name: 'Wrigley Field', category: 'icon', desc: 'Even if you\'re not a Cubs fan, a game at Wrigley is a Chicago rite of passage. Bleacher seats, Old Style beer, the manual scoreboard.', tip: 'Rooftop bars across the street let you watch for free (mostly).' },
  { name: 'Hyde Park & University of Chicago', category: 'architecture', desc: 'Stunning Gothic campus, Obama\'s house nearby, Museum of Science on the lakefront. A full day trip from Streeterville.', tip: 'Walk through the quad on a sunny day.' },
  { name: 'Green Mill Cocktail Lounge', category: 'hidden', desc: 'Al Capone\'s favorite speakeasy. Still operating since 1907. Jazz every night, best on Sunday for the Poetry Slam.', tip: 'Cash only, no dress code, arrive early for a booth.' },
  { name: 'Pilsen Mural Tour', category: 'hidden', desc: 'Self-guided walk through Chicago\'s Mexican-American neighborhood. Every block has massive murals, world-class street art.', tip: 'Pair with lunch at any taqueria on 18th Street.' },
]

const CATEGORIES = ['all', 'icon', 'architecture', 'culture', 'nature', 'hidden']

const CAT_COLORS = {
  icon: '#00d4ff', architecture: '#f97316', culture: '#8b5cf6',
  nature: '#10b981', hidden: '#eab308', all: '#64748b'
}

function AIChatBox() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [streaming, setStreaming] = useState(false)

  async function ask() {
    if (!question.trim() || streaming) return
    setAnswer('')
    setStreaming(true)
    try {
      const res = await fetch(`${API}/api/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question, context: 'explore' })
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { setStreaming(false); return }
          try {
            const p = JSON.parse(data)
            if (p.text) setAnswer(a => a + p.text)
          } catch { /* skip */ }
        }
      }
    } catch {
      setAnswer('AI unavailable — add ANTHROPIC_API_KEY to enable.')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="explore-ai">
      <div className="explore-ai-label">
        <RiBrainLine />
        ASK YOUR CHICAGO GUIDE
      </div>
      <div className="explore-ai-input-row">
        <input
          className="explore-ai-input"
          placeholder="What should I do this weekend? Best deep dish spots? Weekend day trips?"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && ask()}
        />
        <button className="explore-ai-btn" onClick={ask} disabled={streaming}>
          {streaming ? '...' : 'Ask'}
        </button>
      </div>
      {(answer || streaming) && (
        <div className="explore-ai-answer">
          {answer}
          {streaming && <span className="explore-ai-cursor">|</span>}
        </div>
      )}
    </div>
  )
}

export default function ExplorePage() {
  const [category, setCategory] = useState('all')
  const filtered = category === 'all' ? LANDMARKS : LANDMARKS.filter(l => l.category === category)

  return (
    <div className="explore-page">
      <div className="explore-header">
        <span className="explore-title">Explore Chicago</span>
        <span className="explore-sub">New to the city — start here</span>
      </div>

      <AIChatBox />

      <div className="explore-filters">
        {CATEGORIES.map(c => (
          <button
            key={c}
            className={`explore-filter-btn${category === c ? ' active' : ''}`}
            style={{ '--cat-color': CAT_COLORS[c] }}
            onClick={() => setCategory(c)}
          >{c}</button>
        ))}
      </div>

      <div className="explore-grid">
        {filtered.map(l => (
          <div key={l.name} className="explore-card" style={{ '--cat-color': CAT_COLORS[l.category] }}>
            <div className="explore-card-cat">{l.category}</div>
            <div className="explore-card-name">{l.name}</div>
            <div className="explore-card-desc">{l.desc}</div>
            <div className="explore-card-tip">
              <span className="explore-tip-label">TIP</span>
              {l.tip}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
