# Mermalaid for Slack

Render [Mermaid.js](https://mermaid.js.org) diagrams right inside Slack. Run
`/mermalaid`, paste your diagram code into the dialog, and Mermalaid renders it
to a PNG and posts it in the channel.

This is the equivalent of [mermaid-preview.com](https://mermaid-preview.com),
built on Mermalaid's own rendering and deployed as **Vercel serverless
functions + headless Chromium** — the diagram content is rendered inside your
own function and never sent to a third-party service.

```
/mermalaid
  → opens a modal (paste code + pick a theme)
  → server renders the diagram to PNG with headless Chromium
  → PNG is uploaded and shared into the channel
```

## Architecture

| Piece | Path |
| --- | --- |
| Slash command endpoint (opens the modal) | [`api/slack/commands.ts`](../api/slack/commands.ts) |
| Interactivity endpoint (renders + posts) | [`api/slack/interactions.ts`](../api/slack/interactions.ts) |
| Headless Chromium renderer | [`api/_lib/renderMermaid.ts`](../api/_lib/renderMermaid.ts) |
| Slack Web API client (upload flow) | [`api/_lib/slackApi.ts`](../api/_lib/slackApi.ts) |
| Request signature verification | [`api/_lib/slackVerify.ts`](../api/_lib/slackVerify.ts) |
| Modal builder + submission parser | [`api/_lib/modal.ts`](../api/_lib/modal.ts) |
| App manifest | [`slack/manifest.json`](./manifest.json) |
| Landing page | `/slack` route ([`src/components/SlackLandingPage.tsx`](../src/components/SlackLandingPage.tsx)) |

Because Slack requires a response within 3 seconds and a cold Chromium render
takes longer, the modal submission is acknowledged immediately (the modal
closes) and the render + upload run as background work via Vercel's
[`waitUntil`](https://vercel.com/docs/functions/functions-api-reference#waituntil).
If the render fails (e.g. a syntax error) or the bot can't post to the channel,
the error is reported back to the user privately via the slash command's
`response_url`, which works even when the bot isn't a channel member.

**Security / limits:** diagrams are rendered with Mermaid's `strict` security
level (HTML/script in labels is sanitized) and the render browser is blocked
from making any network requests, so untrusted diagram markup can't execute
script or trigger server-side requests (SSRF). Submitted source is capped at
12,000 characters, and each render is bounded by a 25s timeout. There is no
per-user rate limiting yet — see "single workspace first" below.

## Setup (self-host — ~2 clicks + paste)

A Slack app is inherently tied to *your* workspace and *your* host, so there's
an unavoidable one-time setup. The two buttons below remove most of the manual
work: you click through app creation and a deploy, then paste two tokens and
set two URLs. (For a truly one-click "Add to Slack" experience you'd need public
OAuth distribution + a per-workspace token store — see the note at the end.)

> **Prefer to do it by hand?** Create the app by pasting
> [`slack/manifest.json`](./manifest.json) into **api.slack.com/apps → Create
> New App → From a manifest**, and deploy the repo to Vercel however you like.
> Regenerate the button links below with `node scripts/slack-install-links.mjs`.

### 1. Create the Slack app (manifest pre-filled)

[**➕ Create the Mermalaid Slack app**][create-app]

This opens Slack's create-app flow with the manifest already filled in — pick
your workspace and click **Create**. The request URLs start as `YOUR_DOMAIN`
placeholders; you point them at your real domain in step 4.

The manifest requests these bot scopes:

| Scope | Why |
| --- | --- |
| `commands` | Register the `/mermalaid` slash command |
| `chat:write` | Post messages / ephemeral error notices |
| `chat:write.public` | Post to public channels the bot hasn't joined |
| `files:write` | Upload the rendered PNG |
| `channels:join` | Auto-join a public channel so the file share succeeds |

### 2. Install it and copy two secrets

In the app settings: **Install App → Install to Workspace → Allow**. Then copy:

- **Bot User OAuth Token** (`xoxb-…`) — from *Install App*
- **Signing Secret** — from *Basic Information → App Credentials*

### 3. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)][deploy]

This clones the repo to your GitHub and deploys it. When prompted, paste the two
values from step 2 as `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET`. When it
finishes, note your domain, e.g. `mermalaid-slack.vercel.app`.

### 4. Point Slack at your domain

Back in the Slack app settings, replace the `YOUR_DOMAIN` placeholders with your
Vercel domain:

- **Slash Commands → `/mermalaid`** → `https://<your-domain>/api/slack/commands`
- **Interactivity & Shortcuts → Request URL** → `https://<your-domain>/api/slack/interactions`

### 5. Test

In any Slack channel, run `/mermalaid`, paste a diagram, pick a theme, and hit
**Render**:

```mermaid
graph TD
  A[Start] --> B{Works?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Fix it]
  D --> B
```

A rendered PNG should appear in the channel within a few seconds.

[create-app]: https://api.slack.com/apps?new_app=1&manifest_yaml=display_information%3A%0A%20%20name%3A%20Mermalaid%0A%20%20description%3A%20Render%20Mermaid.js%20diagrams%20right%20inside%20Slack.%0A%20%20background_color%3A%20%22%231f6feb%22%0Afeatures%3A%0A%20%20bot_user%3A%0A%20%20%20%20display_name%3A%20mermalaid%0A%20%20%20%20always_online%3A%20true%0A%20%20slash_commands%3A%0A%20%20%20%20-%20command%3A%20%2Fmermalaid%0A%20%20%20%20%20%20url%3A%20https%3A%2F%2FYOUR_DOMAIN%2Fapi%2Fslack%2Fcommands%0A%20%20%20%20%20%20description%3A%20Render%20a%20Mermaid%20diagram%20and%20post%20it%20in%20the%20channel%0A%20%20%20%20%20%20usage_hint%3A%20%22%5Boptional%20Mermaid%20code%5D%22%0A%20%20%20%20%20%20should_escape%3A%20false%0Aoauth_config%3A%0A%20%20scopes%3A%0A%20%20%20%20bot%3A%0A%20%20%20%20%20%20-%20commands%0A%20%20%20%20%20%20-%20chat%3Awrite%0A%20%20%20%20%20%20-%20chat%3Awrite.public%0A%20%20%20%20%20%20-%20files%3Awrite%0A%20%20%20%20%20%20-%20channels%3Ajoin%0Asettings%3A%0A%20%20interactivity%3A%0A%20%20%20%20is_enabled%3A%20true%0A%20%20%20%20request_url%3A%20https%3A%2F%2FYOUR_DOMAIN%2Fapi%2Fslack%2Finteractions%0A%20%20org_deploy_enabled%3A%20false%0A%20%20socket_mode_enabled%3A%20false%0A%20%20token_rotation_enabled%3A%20false%0A
[deploy]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhighvoltag3%2Fmermalaid&env=SLACK_BOT_TOKEN%2CSLACK_SIGNING_SECRET&envDescription=Bot+token+%28xoxb-%E2%80%A6%29+and+signing+secret+from+your+Slack+app&envLink=https%3A%2F%2Fgithub.com%2Fhighvoltag3%2Fmermalaid%2Fblob%2Fmain%2Fslack%2FREADME.md&project-name=mermalaid-slack&repository-name=mermalaid-slack

## Local development

Rendering works locally against a system Chrome (no `@sparticuz/chromium`
needed). The renderer auto-detects the standard macOS Chrome path, or set
`PUPPETEER_EXECUTABLE_PATH`.

To exercise the Slack endpoints locally you need a public HTTPS tunnel to your
machine so Slack can reach them:

```bash
# Terminal 1 — run the Vercel dev server (serves /api functions)
npx vercel dev

# Terminal 2 — expose it (any tunnel works)
npx ngrok http 3000
```

Point the slash-command URL and interactivity request URL in your Slack app
settings at `https://<tunnel-host>/api/slack/…`, and put your Slack env vars in
a local `.env` (see [`.env.example`](../.env.example)).

You can also render a diagram straight to a PNG file without Slack, to check the
renderer:

```bash
node scripts/render-mermaid-sample.mjs "graph TD; A-->B" out.png
```

## Themes

The modal offers Mermaid's built-in themes: **Default**, **Dark**, **Forest**,
and **Neutral**. Dark renders on a dark background; the others on white.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid request signature` (401) | `SLACK_SIGNING_SECRET` is wrong or missing. |
| Modal opens but nothing is posted | Check the function logs. Common causes: the bot isn't in a **private** channel (invite it), or `SLACK_BOT_TOKEN` lacks `files:write`. |
| `not_in_channel` | For private channels, `/invite @mermalaid`. Public channels are auto-joined. |
| Render times out / OOM on Vercel | Raise the function memory in `vercel.json` (`functions` → `memory`), or the `maxDuration`. |
| `Could not load the Mermaid library` | The bundled `mermaid.min.js` wasn't deployed; the function falls back to a CDN. Set `MERMAID_UMD_URL` if your environment blocks the default CDN. |

## Notes on this being "single workspace first"

This setup installs the app to **one** workspace using a bot token. It does not
implement the public "Add to Slack" OAuth distribution flow (multi-workspace
installs, per-team token storage). The code is structured so that adding an
`/api/slack/oauth` callback + a token store later is straightforward — the
render and posting logic is workspace-agnostic and only needs the right bot
token passed in.
