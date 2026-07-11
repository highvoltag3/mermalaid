/**
 * Orchestrates the async half of a render request: rasterize the diagram and
 * share it into the channel, or report a failure back to the user.
 * Runs as background work (see runBackground) after the modal has been closed.
 *
 * Error reporting prefers the slash-command `response_url` because it reaches
 * the user even when the bot isn't a member of the channel — chat.postEphemeral
 * silently fails for non-member channels, which is the common case here.
 */
import { renderMermaidToPng, MermaidRenderError } from './renderMermaid.js'
import type { ServerMermaidTheme } from './serverThemes.js'
import {
  uploadImageToChannel,
  tryJoinConversation,
  postEphemeral,
  postToResponseUrl,
  SlackApiError,
} from './slackApi.js'

export interface RenderAndPostParams {
  botToken: string
  code: string
  theme: ServerMermaidTheme
  channelId: string
  userId: string
  /** Slash-command response_url, used to report errors without channel membership. */
  responseUrl?: string
}

export async function renderAndPost(params: RenderAndPostParams): Promise<void> {
  const { botToken, code, theme, channelId, userId } = params

  try {
    const png = await renderMermaidToPng(code, theme)

    // Join public channels the bot isn't in yet so the share succeeds.
    await tryJoinConversation(botToken, channelId)

    await uploadImageToChannel({
      token: botToken,
      channel: channelId,
      filename: 'mermalaid-diagram.png',
      title: 'Mermaid diagram',
      initialComment: `Rendered by <@${userId}> with :fish: Mermalaid`,
      png,
    })
  } catch (err) {
    await reportError(err, params)
  }
}

/** Map an internal error to a safe, user-facing message (never leak internals). */
function userFacingMessage(err: unknown): string {
  // MermaidRenderError messages are sanitized, actionable syntax errors.
  if (err instanceof MermaidRenderError) {
    return `:warning: ${err.message}`
  }
  // The bot can't post here (typically a private channel it wasn't invited to).
  if (
    err instanceof SlackApiError &&
    /not_in_channel|channel_not_found|is_archived|no_permission/.test(err.slackError)
  ) {
    return ":warning: I couldn't post to this channel. Invite @mermalaid here (or use a public channel), then try again."
  }
  return ':warning: Something went wrong rendering your diagram. Please try again.'
}

async function reportError(err: unknown, params: RenderAndPostParams): Promise<void> {
  // Always log the real error server-side for debugging.
  console.error('[mermalaid] render/post failed:', err)

  const message = userFacingMessage(err)
  const { botToken, channelId, userId, responseUrl } = params

  // Prefer response_url — it works even when the bot isn't a channel member.
  if (responseUrl) {
    try {
      await postToResponseUrl(responseUrl, message)
      return
    } catch (reportErr) {
      console.error('[mermalaid] response_url report failed:', reportErr)
    }
  }

  // Fallback: ephemeral message (only delivers if the bot is in the channel).
  if (channelId && userId) {
    await postEphemeral(botToken, channelId, userId, message).catch(() => {
      // Nothing more we can do if even the fallback fails.
    })
  }
}
