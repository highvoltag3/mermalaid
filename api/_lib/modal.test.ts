import { describe, it, expect } from 'vitest'
import {
  buildRenderModal,
  parseRenderSubmission,
  RENDER_CALLBACK_ID,
  CODE_BLOCK_ID,
  CODE_ACTION_ID,
  THEME_BLOCK_ID,
  THEME_ACTION_ID,
} from './modal.js'

describe('buildRenderModal', () => {
  it('builds a modal carrying the channel in private_metadata', () => {
    const view = buildRenderModal({ channelId: 'C123', initialCode: 'graph TD; A-->B' })
    expect(view.type).toBe('modal')
    expect(view.callback_id).toBe(RENDER_CALLBACK_ID)
    expect(JSON.parse(view.private_metadata as string)).toEqual({ channel_id: 'C123' })
    const blocks = view.blocks as Array<Record<string, unknown>>
    expect(blocks[0].block_id).toBe(CODE_BLOCK_ID)
    const codeEl = blocks[0].element as Record<string, unknown>
    expect(codeEl.multiline).toBe(true)
    expect(codeEl.initial_value).toBe('graph TD; A-->B')
  })

  it('round-trips the response_url when provided', () => {
    const view = buildRenderModal({ channelId: 'C1', responseUrl: 'https://hooks.slack.com/x' })
    expect(JSON.parse(view.private_metadata as string)).toEqual({
      channel_id: 'C1',
      response_url: 'https://hooks.slack.com/x',
    })
  })

  it('omits initial_value when no code is passed', () => {
    const view = buildRenderModal({ channelId: 'C1' })
    const blocks = view.blocks as Array<Record<string, unknown>>
    const codeEl = blocks[0].element as Record<string, unknown>
    expect(codeEl.initial_value).toBeUndefined()
  })
})

function submission(code: string | undefined, theme: string | undefined, metadata: string) {
  return {
    view: {
      private_metadata: metadata,
      state: {
        values: {
          [CODE_BLOCK_ID]: { [CODE_ACTION_ID]: { value: code } },
          [THEME_BLOCK_ID]: { [THEME_ACTION_ID]: { selected_option: theme ? { value: theme } : undefined } },
        },
      },
    },
  }
}

describe('parseRenderSubmission', () => {
  it('extracts code, theme and channel', () => {
    const parsed = parseRenderSubmission(
      submission('graph TD; A-->B', 'dark', JSON.stringify({ channel_id: 'C999' })),
    )
    expect(parsed).toEqual({ code: 'graph TD; A-->B', theme: 'dark', channelId: 'C999', responseUrl: undefined })
  })

  it('falls back to the default theme for an unknown value', () => {
    const parsed = parseRenderSubmission(
      submission('x', 'rainbow', JSON.stringify({ channel_id: 'C1' })),
    )
    expect(parsed.theme).toBe('default')
  })

  it('tolerates malformed private_metadata', () => {
    const parsed = parseRenderSubmission(submission('x', 'forest', 'not-json{'))
    expect(parsed.channelId).toBe('')
    expect(parsed.theme).toBe('forest')
  })

  it('returns empty code when the field is missing', () => {
    const parsed = parseRenderSubmission(submission(undefined, undefined, JSON.stringify({ channel_id: 'C1' })))
    expect(parsed.code).toBe('')
    expect(parsed.theme).toBe('default')
  })
})
