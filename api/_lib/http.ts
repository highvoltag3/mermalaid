/** Small helpers shared by the Slack HTTP handlers (Web Fetch API signature). */
import { getSlackEnv, MissingEnvError, type SlackEnv } from './env.js'
import { verifySlackSignature } from './slackVerify.js'

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export interface VerifiedSlackContext {
  env: SlackEnv
  rawBody: string
  /** The urlencoded body pre-parsed (slash commands + interactions are form posts). */
  params: URLSearchParams
}

/**
 * Wrap a Slack endpoint so it only runs for POSTs with a valid Slack signature.
 * This is the request-authentication boundary: handler logic is unreachable
 * without passing verification, so it can't be accidentally bypassed.
 */
export function withVerifiedSlack(
  handler: (ctx: VerifiedSlackContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== 'POST') return text('Method Not Allowed', 405)

    const rawBody = await req.text()

    let env: SlackEnv
    try {
      env = getSlackEnv()
    } catch (err) {
      if (err instanceof MissingEnvError) {
        // Log the specifics server-side; don't reveal which vars are unset to callers.
        console.error('[mermalaid]', err.message)
        return text('Server configuration error.', 500)
      }
      throw err
    }

    const valid = verifySlackSignature({
      signingSecret: env.signingSecret,
      rawBody,
      timestamp: req.headers.get('x-slack-request-timestamp'),
      signature: req.headers.get('x-slack-signature'),
    })
    if (!valid) return text('Invalid request signature', 401)

    return handler({ env, rawBody, params: new URLSearchParams(rawBody) })
  }
}

/**
 * Run a promise as background work that outlives the HTTP response.
 * On Vercel this uses waitUntil so the function stays alive until it settles;
 * elsewhere it detaches and swallows errors so it can't crash the response.
 */
export async function runBackground(promise: Promise<unknown>): Promise<void> {
  try {
    const { waitUntil } = await import('@vercel/functions')
    waitUntil(promise)
  } catch {
    void promise.catch(() => {})
  }
}
