import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { useFadeInSections } from '../hooks/useFadeInSections'
import './LandingPage.css'
import './SlackLandingPage.css'

const GITHUB_URL = 'https://github.com/highvoltag3/mermalaid'
const SETUP_GUIDE_URL = 'https://github.com/highvoltag3/mermalaid/blob/main/slack/README.md'
const MANIFEST_URL = 'https://github.com/highvoltag3/mermalaid/blob/main/slack/manifest.json'

const heroHighlights = [
  'Renders every Mermaid diagram type',
  'Diagram content never leaves your own server',
  'Light, dark, forest and neutral themes',
  'No third-party render service',
]

const steps = [
  {
    num: '1',
    title: 'Run /mermalaid',
    description: 'Type the slash command in any channel. Add code inline, or leave it blank to open a blank editor.',
  },
  {
    num: '2',
    title: 'Paste your Mermaid code',
    description: 'A dialog opens with a code field and a theme picker. Paste a flowchart, sequence diagram, ER diagram — anything Mermaid supports.',
  },
  {
    num: '3',
    title: 'Get a rendered PNG in the channel',
    description: 'Mermalaid renders the diagram with headless Chromium and posts the PNG right where you ran the command.',
  },
]

const features = [
  {
    icon: '🔒',
    title: 'Self-hosted rendering',
    description: 'Diagrams render inside your own serverless function with a bundled copy of Mermaid. The content is never sent to a third-party service.',
  },
  {
    icon: '🧩',
    title: 'Every diagram type',
    description: 'Flowcharts, sequence, class, state, ER, gantt, mindmaps, timelines and more — the same engine that powers the Mermalaid editor.',
  },
  {
    icon: '🎨',
    title: 'Themes built in',
    description: 'Pick Default, Dark, Forest or Neutral per render, so diagrams match the look you want in the conversation.',
  },
  {
    icon: '⚡',
    title: 'Fast and free',
    description: 'No sign-up, no per-seat pricing, no document caps. Deploy once to your workspace and share diagrams instantly.',
  },
]

const EXAMPLE_CODE = `sequenceDiagram
  actor U as Slack User
  participant M as Mermalaid
  U->>M: /mermalaid
  M-->>U: Show dialog
  U->>M: Submit code
  Note over M: Render PNG
  M-->>U: Post diagram in channel`

/** Small inline SVG that stands in for a rendered diagram inside the Slack mock. */
function DiagramGlyph() {
  return (
    <svg viewBox="0 0 240 150" className="slack-mock-diagram" role="img" aria-label="Rendered Mermaid diagram">
      <rect x="86" y="8" width="68" height="34" rx="6" className="slack-glyph-node" />
      <text x="120" y="30" className="slack-glyph-text">Start</text>
      <path d="M120 42 L120 62" className="slack-glyph-edge" />
      <path d="M120 62 l30 21 l-30 21 l-30 -21 Z" className="slack-glyph-node" />
      <text x="120" y="89" className="slack-glyph-text">Works?</text>
      <path d="M96 96 L52 122" className="slack-glyph-edge" />
      <path d="M144 96 L188 122" className="slack-glyph-edge" />
      <rect x="14" y="122" width="72" height="26" rx="6" className="slack-glyph-node" />
      <text x="50" y="139" className="slack-glyph-text">Ship it</text>
      <rect x="154" y="122" width="72" height="26" rx="6" className="slack-glyph-node" />
      <text x="190" y="139" className="slack-glyph-text">Fix it</text>
    </svg>
  )
}

export default function SlackLandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const resolvedDark = usePrefersDark()
  useFadeInSections(rootRef)

  return (
    <div className={`landing${resolvedDark ? ' landing-dark' : ''}`} ref={rootRef}>
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-logo">
            <img src="/apple-touch-icon.png" alt="Mermalaid logo" className="landing-logo-img" width="120" height="120" />
            <span className="landing-logo-text">Mermalaid</span>
          </a>
          <div className="landing-nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#setup">Setup</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <Link to="/editor" className="landing-nav-cta">
            Go to Editor
            <span className="landing-nav-cta-arrow">&rarr;</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true">
          <div className="landing-hero-orb landing-hero-orb-1" />
          <div className="landing-hero-orb landing-hero-orb-2" />
          <div className="landing-hero-noise" />
        </div>
        <div className="landing-hero-content">
          <div className="landing-hero-text">
            <div className="landing-hero-badge">
              <span className="landing-hero-badge-dot" />
              Mermaid diagrams, right inside Slack
            </div>
            <h1>Render Mermaid.js diagrams in Slack</h1>
            <p className="landing-hero-sub">
              Run <code>/mermalaid</code>, paste your Mermaid code, and Mermalaid renders it to an
              image and posts it in the channel — communicate flows, architecture and plans without
              leaving the conversation.
            </p>
            <div className="landing-hero-actions">
              <a href="#setup" className="landing-btn landing-btn-primary">
                Add to your workspace
              </a>
              <Link to="/editor" className="landing-btn landing-btn-secondary">
                Open the editor
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-ghost">
                View on GitHub
              </a>
            </div>
            <ul className="landing-hero-highlights">
              {heroHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="landing-hero-visual">
            <div className="slack-mock">
              <div className="slack-mock-row">
                <div className="slack-mock-avatar" aria-hidden="true">M</div>
                <div className="slack-mock-body">
                  <div className="slack-mock-meta">
                    <span className="slack-mock-name">Mermalaid</span>
                    <span className="slack-mock-app-tag">APP</span>
                    <span className="slack-mock-time">10:24 AM</span>
                  </div>
                  <p className="slack-mock-comment">
                    Rendered by <span className="slack-mock-mention">@you</span> with 🐟 Mermalaid
                  </p>
                  <div className="slack-mock-file">
                    <DiagramGlyph />
                  </div>
                </div>
              </div>
              <div className="slack-mock-command">
                <span className="slack-mock-slash">/mermalaid</span> graph TD; A[Start] --&gt; B&#123;Works?&#125;
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section id="how" className="landing-section fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">How it works</p>
          <h2>From slash command to shared diagram in seconds</h2>
          <p className="landing-section-sub">
            The same three-step flow as a dedicated diagram bot — powered by Mermalaid's own renderer.
          </p>
          <div className="slack-steps">
            {steps.map((step) => (
              <article key={step.num} className="slack-step">
                <span className="slack-step-num" aria-hidden="true">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Example */}
      <section className="landing-section slack-example-section fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Example</p>
          <h2>Use Mermaid.js code to describe your idea</h2>
          <p className="landing-section-sub">
            See the <a href="https://mermaid.js.org" target="_blank" rel="noopener noreferrer">Mermaid.js documentation</a> for
            every chart type and option. Here is the diagram this bot draws of itself:
          </p>
          <div className="slack-example">
            <pre className="slack-code"><code>{EXAMPLE_CODE}</code></pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section landing-features fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Why Mermalaid for Slack</p>
          <h2>A privacy-first diagram bot you host yourself</h2>
          <div className="landing-features-grid">
            {features.map((card) => (
              <article key={card.title} className="landing-feature-card">
                <div className="landing-feature-icon" aria-hidden="true">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Setup */}
      <section id="setup" className="landing-section slack-setup-section fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Setup</p>
          <h2>Add Mermalaid to your Slack workspace</h2>
          <p className="landing-section-sub">
            Mermalaid for Slack is self-hosted. Deploy this repo, create a Slack app from the provided
            manifest, and drop in two environment variables. The full runbook is in the setup guide.
          </p>
          <ol className="slack-setup-list">
            <li>Deploy the repo (Vercel) so you have a public URL for the endpoints.</li>
            <li>
              Create a Slack app <em>from a manifest</em> using{' '}
              <a href={MANIFEST_URL} target="_blank" rel="noopener noreferrer">slack/manifest.json</a>,
              replacing <code>YOUR_DOMAIN</code>.
            </li>
            <li>Install it to your workspace and copy the bot token + signing secret.</li>
            <li>
              Set <code>SLACK_BOT_TOKEN</code> and <code>SLACK_SIGNING_SECRET</code> in your host, then
              redeploy.
            </li>
          </ol>
          <div className="landing-hero-actions">
            <a href={SETUP_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-primary">
              Read the setup guide
            </a>
            <a href={MANIFEST_URL} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-ghost">
              View the manifest
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container landing-footer-row">
          <div className="landing-footer-logo-row">
            <img src="/apple-touch-icon.png" alt="Mermalaid" width="24" height="24" className="landing-logo-img" />
            <span className="landing-logo-text">Mermalaid</span>
          </div>
          <nav className="landing-footer-nav">
            <Link to="/">Home</Link>
            <Link to="/editor">Editor</Link>
            <a href="#how">How it works</a>
            <a href="#setup">Setup</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} Mermalaid. Source-available (CC BY-NC-SA 4.0, non-commercial).</p>
        </div>
      </footer>
    </div>
  )
}
