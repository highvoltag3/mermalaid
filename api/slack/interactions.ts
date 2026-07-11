/**
 * Interactivity endpoint: POST /api/slack/interactions
 *
 * Slack calls this when the user submits the render modal (view_submission).
 * We must respond within 3s, so we validate + close the modal immediately and
 * do the slow render/upload as background work (runBackground → waitUntil).
 */
import {
  RENDER_CALLBACK_ID,
  CODE_BLOCK_ID,
  parseRenderSubmission,
  type SlackViewSubmission,
} from '../_lib/modal.js'
import { renderAndPost } from '../_lib/renderAndPost.js'
import { json, text, runBackground, withVerifiedSlack } from '../_lib/http.js'

/** Upper bound on submitted diagram source — a cheap guard against abuse. */
const MAX_CODE_LENGTH = 12_000

export default withVerifiedSlack(async ({ env, params }) => {
  const payloadRaw = params.get('payload')
  if (!payloadRaw) return text('Missing payload', 400)

  let payload: SlackViewSubmission
  try {
    payload = JSON.parse(payloadRaw) as SlackViewSubmission
  } catch {
    return text('Malformed payload', 400)
  }

  // Only handle submissions of our render modal; ack anything else.
  if (payload.type === 'view_submission' && payload.view?.callback_id === RENDER_CALLBACK_ID) {
    const { code, theme, channelId, responseUrl } = parseRenderSubmission(payload)
    const userId = payload.user?.id ?? ''

    if (!code.trim()) {
      // Keep the modal open with an inline validation error.
      return json({
        response_action: 'errors',
        errors: { [CODE_BLOCK_ID]: 'Please enter some Mermaid code to render.' },
      })
    }

    if (code.length > MAX_CODE_LENGTH) {
      return json({
        response_action: 'errors',
        errors: {
          [CODE_BLOCK_ID]: `That's a lot of Mermaid — please keep it under ${MAX_CODE_LENGTH.toLocaleString()} characters.`,
        },
      })
    }

    if (!channelId) {
      return json({
        response_action: 'errors',
        errors: { [CODE_BLOCK_ID]: 'Could not determine which channel to post to. Try running /mermalaid again.' },
      })
    }

    // Render + upload happen after we close the modal (well beyond Slack's 3s window).
    await runBackground(
      renderAndPost({ botToken: env.botToken, code, theme, channelId, userId, responseUrl }),
    )

    return json({ response_action: 'clear' })
  }

  return new Response(null, { status: 200 })
})
