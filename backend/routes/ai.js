// backend/routes/ai.js
const router = require('express').Router()

const FALLBACK_RESPONSES = {
  neighborhood: (name) => `${name} is one of Chicago's most vibrant neighborhoods, known for its unique character and community spirit. Whether you're looking for dining, nightlife, or cultural experiences, you'll find plenty to explore here.`,
  explore: () => 'Chicago is a city of neighborhoods, each with its own distinct personality. From the architectural marvels of the Loop to the lakefront beaches of Streeterville, there\'s always something new to discover.',
  general: () => 'Chicago is an incredible city to call home. With world-class dining, rich cultural institutions, beautiful lakefront access, and a world-renowned music scene, you\'ll never run out of things to explore.'
}

router.post('/stream', async (req, res) => {
  const { prompt, context } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    // Graceful fallback: return a static response as a stream
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    const text = FALLBACK_RESPONSES.general()
    const words = text.split(' ')
    let i = 0
    const interval = setInterval(() => {
      if (i >= words.length) {
        res.write('data: [DONE]\n\n')
        res.end()
        clearInterval(interval)
        return
      }
      res.write(`data: ${JSON.stringify({ text: words[i] + ' ' })}\n\n`)
      i++
    }, 50)
    return
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: key })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const systemPrompt = context === 'neighborhood'
      ? 'You are a Chicago local giving a new resident a warm, honest briefing about a neighborhood. Be specific, personal, and concise (3-4 sentences). No bullet points.'
      : 'You are a Chicago expert helping someone new to the city discover what makes it special. Be warm, specific, and concise (3-4 sentences).'

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
      }
    }
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  }
})

module.exports = router
