/**
 * The "Render a Mermaid diagram" modal: builder + submission parser.
 * Shared between the slash-command handler (opens it) and the interaction
 * handler (parses what the user submitted).
 */
import {
  SERVER_MERMAID_THEMES,
  isServerMermaidTheme,
  type ServerMermaidTheme,
} from './renderMermaid.js'

export const RENDER_CALLBACK_ID = 'mermalaid_render'
export const CODE_BLOCK_ID = 'code_block'
export const CODE_ACTION_ID = 'code'
export const THEME_BLOCK_ID = 'theme_block'
export const THEME_ACTION_ID = 'theme'

const EXAMPLE_PLACEHOLDER = `graph TD
  A[Start] --> B{Works?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Fix it]
  D --> B`

function themeLabel(theme: ServerMermaidTheme): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1)
}

export interface BuildModalParams {
  channelId: string
  initialCode?: string
  /** Optional Slack response_url from the slash command, stashed for later use. */
  responseUrl?: string
}

/** The private_metadata we round-trip through the modal (JSON-encoded). */
interface ModalMetadata {
  channel_id: string
  response_url?: string
}

/** Build the modal view passed to views.open. */
export function buildRenderModal(params: BuildModalParams): Record<string, unknown> {
  const metadata: ModalMetadata = { channel_id: params.channelId }
  if (params.responseUrl) metadata.response_url = params.responseUrl

  const themeOptions = SERVER_MERMAID_THEMES.map((theme) => ({
    text: { type: 'plain_text', text: themeLabel(theme) },
    value: theme,
  }))

  return {
    type: 'modal',
    callback_id: RENDER_CALLBACK_ID,
    private_metadata: JSON.stringify(metadata),
    title: { type: 'plain_text', text: 'Mermalaid' },
    submit: { type: 'plain_text', text: 'Render' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: CODE_BLOCK_ID,
        label: { type: 'plain_text', text: 'Mermaid code' },
        element: {
          type: 'plain_text_input',
          action_id: CODE_ACTION_ID,
          multiline: true,
          ...(params.initialCode ? { initial_value: params.initialCode } : {}),
          placeholder: { type: 'plain_text', text: EXAMPLE_PLACEHOLDER },
        },
      },
      {
        type: 'input',
        optional: true,
        block_id: THEME_BLOCK_ID,
        label: { type: 'plain_text', text: 'Theme' },
        element: {
          type: 'static_select',
          action_id: THEME_ACTION_ID,
          initial_option: themeOptions[0],
          options: themeOptions,
        },
      },
    ],
  }
}

export interface ParsedSubmission {
  code: string
  theme: ServerMermaidTheme
  channelId: string
  responseUrl?: string
}

/** Shape of the parts of a Slack view_submission interaction payload we read. */
export interface SlackViewSubmission {
  type?: string
  user?: { id?: string }
  view?: {
    callback_id?: string
    private_metadata?: string
    state?: {
      values?: Record<string, Record<string, {
        value?: string
        selected_option?: { value?: string }
      }>>
    }
  }
}

/** Extract code + theme + target channel from a view_submission payload. */
export function parseRenderSubmission(payload: SlackViewSubmission): ParsedSubmission {
  const values = payload.view?.state?.values ?? {}
  const code = values[CODE_BLOCK_ID]?.[CODE_ACTION_ID]?.value ?? ''
  const selectedTheme = values[THEME_BLOCK_ID]?.[THEME_ACTION_ID]?.selected_option?.value ?? 'default'
  const theme: ServerMermaidTheme = isServerMermaidTheme(selectedTheme) ? selectedTheme : 'default'

  let metadata: ModalMetadata = { channel_id: '' }
  try {
    metadata = JSON.parse(payload.view?.private_metadata ?? '{}') as ModalMetadata
  } catch {
    // Leave defaults; the handler will surface a clear error if channel is missing.
  }

  return {
    code,
    theme,
    channelId: metadata.channel_id ?? '',
    responseUrl: metadata.response_url,
  }
}
