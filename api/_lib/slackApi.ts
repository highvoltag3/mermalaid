/**
 * Minimal Slack Web API client for the bits this integration needs:
 *   - views.open (show the render modal)
 *   - the external file-upload flow (getUploadURLExternal → PUT bytes → completeUploadExternal)
 *   - chat.postEphemeral (report errors privately to the user)
 *   - conversations.join (so the bot can share into public channels it isn't in yet)
 *
 * Uses the global fetch/FormData/Blob available on the Node 20+ runtime.
 */

const SLACK_API = 'https://slack.com/api'

export class SlackApiError extends Error {
  constructor(
    public method: string,
    public slackError: string,
  ) {
    super(`Slack API ${method} failed: ${slackError}`)
    this.name = 'SlackApiError'
  }
}

interface SlackResponse {
  ok: boolean
  error?: string
  [key: string]: unknown
}

async function slackJson(
  method: string,
  token: string,
  body: unknown,
): Promise<SlackResponse> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  })
  return (await res.json()) as SlackResponse
}

async function slackForm(
  method: string,
  token: string,
  params: Record<string, string>,
): Promise<SlackResponse> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: new URLSearchParams(params).toString(),
  })
  return (await res.json()) as SlackResponse
}

/** Open a modal in response to a slash-command trigger_id. */
export async function openView(
  token: string,
  triggerId: string,
  view: unknown,
): Promise<void> {
  const data = await slackJson('views.open', token, { trigger_id: triggerId, view })
  if (!data.ok) throw new SlackApiError('views.open', data.error ?? 'unknown_error')
}

/** Post an ephemeral message (visible only to `user` in `channel`). Best-effort. */
export async function postEphemeral(
  token: string,
  channel: string,
  user: string,
  text: string,
): Promise<void> {
  const data = await slackJson('chat.postEphemeral', token, { channel, user, text })
  if (!data.ok) throw new SlackApiError('chat.postEphemeral', data.error ?? 'unknown_error')
}

/**
 * Post a message to a slash-command `response_url`. This works even when the
 * bot isn't a member of the channel (unlike chat.postEphemeral) and is valid
 * for ~30 minutes, so it's the reliable way to report background errors.
 */
export async function postToResponseUrl(responseUrl: string, text: string): Promise<void> {
  const res = await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ response_type: 'ephemeral', replace_original: false, text }),
  })
  if (!res.ok) throw new SlackApiError('response_url', `HTTP ${res.status}`)
}

/** Best-effort join of a public channel so the bot can share files into it. */
export async function tryJoinConversation(token: string, channel: string): Promise<void> {
  try {
    await slackForm('conversations.join', token, { channel })
  } catch {
    // Ignore — DMs, private channels, and already-joined channels are fine to skip.
  }
}

export interface UploadImageParams {
  token: string
  channel: string
  filename: string
  title: string
  initialComment?: string
  png: Buffer
}

/**
 * Upload a PNG and share it into a channel using Slack's current external
 * upload flow (files.upload is deprecated).
 */
export async function uploadImageToChannel(params: UploadImageParams): Promise<void> {
  const { token, channel, filename, title, initialComment, png } = params

  // 1. Reserve an upload URL for the file.
  const reserve = await slackForm('files.getUploadURLExternal', token, {
    filename,
    length: String(png.length),
  })
  if (!reserve.ok) {
    throw new SlackApiError('files.getUploadURLExternal', reserve.error ?? 'unknown_error')
  }
  const uploadUrl = reserve.upload_url as string
  const fileId = reserve.file_id as string

  // 2. POST the raw bytes to the reserved URL. Buffer is a valid Blob part.
  const form = new FormData()
  form.append('file', new Blob([png], { type: 'image/png' }), filename)
  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form })
  if (!uploadRes.ok) {
    throw new SlackApiError('upload_url', `HTTP ${uploadRes.status}`)
  }

  // 3. Finalize and share into the channel.
  const complete = await slackJson('files.completeUploadExternal', token, {
    files: [{ id: fileId, title }],
    channel_id: channel,
    ...(initialComment ? { initial_comment: initialComment } : {}),
  })
  if (!complete.ok) {
    throw new SlackApiError('files.completeUploadExternal', complete.error ?? 'unknown_error')
  }
}
