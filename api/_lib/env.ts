/** Environment access for the Slack integration. */

export interface SlackEnv {
  botToken: string
  signingSecret: string
}

export class MissingEnvError extends Error {
  constructor(missing: string[]) {
    super(`Missing required environment variable(s): ${missing.join(', ')}`)
    this.name = 'MissingEnvError'
  }
}

/**
 * Read the Slack credentials from the environment. Throws MissingEnvError so
 * handlers can return a clear 500 instead of a cryptic runtime failure.
 */
export function getSlackEnv(): SlackEnv {
  const botToken = process.env.SLACK_BOT_TOKEN
  const signingSecret = process.env.SLACK_SIGNING_SECRET

  const missing: string[] = []
  if (!botToken) missing.push('SLACK_BOT_TOKEN')
  if (!signingSecret) missing.push('SLACK_SIGNING_SECRET')
  if (missing.length > 0) throw new MissingEnvError(missing)

  return { botToken: botToken as string, signingSecret: signingSecret as string }
}
