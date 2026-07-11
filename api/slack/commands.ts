/**
 * Slash command endpoint: POST /api/slack/commands
 *
 * Slack calls this when a user runs `/mermalaid`. After signature verification
 * (see withVerifiedSlack), we open a modal (views.open) prefilled with any
 * inline text. Slack requires a response within 3s, so we only open the modal
 * and return an empty 200.
 */
import { openView } from '../_lib/slackApi.js'
import { buildRenderModal } from '../_lib/modal.js'
import { json, withVerifiedSlack } from '../_lib/http.js'

export default withVerifiedSlack(async ({ env, params }) => {
  const triggerId = params.get('trigger_id')
  const channelId = params.get('channel_id') ?? ''
  const inlineCode = (params.get('text') ?? '').trim()
  const responseUrl = params.get('response_url') ?? undefined

  if (!triggerId) {
    return json({ response_type: 'ephemeral', text: 'Missing trigger_id from Slack.' })
  }

  try {
    await openView(
      env.botToken,
      triggerId,
      buildRenderModal({ channelId, initialCode: inlineCode, responseUrl }),
    )
  } catch (err) {
    // Log the real error server-side; return a generic message to the user.
    console.error('[mermalaid] views.open failed:', err)
    return json({
      response_type: 'ephemeral',
      text: 'Could not open the Mermalaid dialog. Please try again.',
    })
  }

  // Empty 200 → no visible slash-command message; the modal is already open.
  return new Response(null, { status: 200 })
})
