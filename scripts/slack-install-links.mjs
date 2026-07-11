/**
 * Print the one-click self-host links for the Slack integration:
 *   - "Create Slack app from manifest" deep link (manifest pre-filled)
 *   - "Deploy to Vercel" button URL
 *
 * Re-run this if slack/manifest.json or the repo URL changes, then paste the
 * output into slack/README.md and the /slack landing page.
 *
 *   node scripts/slack-install-links.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { stringify as toYaml } from 'yaml'

const REPO_URL = 'https://github.com/highvoltag3/mermalaid'
const SETUP_GUIDE = `${REPO_URL}/blob/main/slack/README.md`

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'slack/manifest.json'), 'utf8'))

// Slack's deep link accepts YAML or JSON in the manifest_yaml param; use YAML.
const manifestYaml = toYaml(manifest)
const createAppUrl =
  `https://api.slack.com/apps?new_app=1&manifest_yaml=${encodeURIComponent(manifestYaml)}`

const deployUrl =
  'https://vercel.com/new/clone?' +
  new URLSearchParams({
    'repository-url': REPO_URL,
    env: 'SLACK_BOT_TOKEN,SLACK_SIGNING_SECRET',
    envDescription: 'Bot token (xoxb-…) and signing secret from your Slack app',
    envLink: SETUP_GUIDE,
    'project-name': 'mermalaid-slack',
    'repository-name': 'mermalaid-slack',
  }).toString()

console.log('--- Create Slack app from manifest (length %d) ---', createAppUrl.length)
console.log(createAppUrl)
console.log('\n--- Deploy to Vercel ---')
console.log(deployUrl)
