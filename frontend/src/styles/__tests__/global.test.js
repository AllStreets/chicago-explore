import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('global.css design tokens', () => {
  let css

  beforeAll(() => {
    css = readFileSync(resolve(__dirname, '../global.css'), 'utf-8')
  })

  const REQUIRED_VARS = ['--bg', '--accent', '--text', '--text-muted', '--surface', '--border', '--font-ui', '--font-mono']

  REQUIRED_VARS.forEach(v => {
    it(`defines ${v}`, () => {
      expect(css).toContain(v + ':')
    })
  })

  it('imports Space Grotesk font', () => {
    expect(css).toContain('Space+Grotesk')
  })

  it('imports JetBrains Mono font', () => {
    expect(css).toContain('JetBrains+Mono')
  })
})
