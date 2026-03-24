// backend/routes/ai.js
const router = require('express').Router()

const FALLBACK_RESPONSES = {
  neighborhood: () => 'This neighborhood has a unique character that makes it special. Explore the local streets, check out the restaurants, and talk to the locals to get a real feel for life here.',
  general: () => 'Chicago is an incredible city to call home. With world-class dining, rich cultural institutions, beautiful lakefront access, and a world-renowned music scene, you\'ll never run out of things to explore.',
}

router.post('/stream', async (req, res) => {
  const { prompt, context } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  const key = process.env.OPENAI_API_KEY

  if (!key) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    const text = context === 'neighborhood' ? FALLBACK_RESPONSES.neighborhood() : FALLBACK_RESPONSES.general()
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
    const OpenAI = require('openai')
    const client = new OpenAI({ apiKey: key })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const systemPrompt = context === 'neighborhood'
      ? 'You are a Chicago local giving a new resident a warm, honest briefing about a neighborhood. Be specific, personal, and concise (3-4 sentences). No bullet points.'
      : 'You are a Chicago expert helping someone new to the city discover what makes it special. Be warm, specific, and concise (3-4 sentences).'

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
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
