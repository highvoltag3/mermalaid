import { describe, it, expect } from 'vitest'
import { renderMermaidToPng } from './renderMermaid.js'

// Gated: launches a real headless Chrome. Run with:
//   RENDER_E2E=1 PUPPETEER_EXECUTABLE_PATH=<chrome> npx vitest run renderMermaid.e2e
const RUN = process.env.RENDER_E2E === '1'

describe.runIf(RUN)('renderMermaidToPng (e2e)', () => {
  it('renders a valid PNG for a flowchart', async () => {
    const png = await renderMermaidToPng('graph TD; A[Signed] --> B[Rendered]', 'default')
    expect(Buffer.isBuffer(png)).toBe(true)
    expect(png.length).toBeGreaterThan(1000)
    // PNG magic number.
    expect(png.subarray(0, 4).toString('hex')).toBe('89504e47')
  }, 60_000)

  it('throws a user-facing error for invalid syntax', async () => {
    await expect(renderMermaidToPng('graph TD; A --> ', 'default')).rejects.toThrow()
  }, 60_000)
})
