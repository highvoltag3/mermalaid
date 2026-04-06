import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import UpdateAvailableBanner from './UpdateAvailableBanner'
import type { LatestReleaseInfo } from '../utils/githubRelease'
import './LandingPage.css'

interface LandingPageProps {
  pendingRelease: LatestReleaseInfo | null
  onDismissPendingRelease: () => void
}

/* ─── Theme Switcher ─── */
const THEMES = ['system', 'light', 'dark'] as const
type Theme = (typeof THEMES)[number]

function ThemeSwitcher({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const activeIndex = THEMES.indexOf(theme)
  return (
    <div
      className="landing-theme-switcher"
      role="radiogroup"
      aria-label="Theme"
      style={{ '--ts-index': activeIndex } as CSSProperties}
    >
      <div className="landing-theme-indicator" />
      <button
        role="radio"
        aria-checked={theme === 'system'}
        aria-label="System theme"
        className={`landing-theme-option${theme === 'system' ? ' active' : ''}`}
        onClick={() => setTheme('system')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      </button>
      <button
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Light theme"
        className={`landing-theme-option${theme === 'light' ? ' active' : ''}`}
        onClick={() => setTheme('light')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>
      <button
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Dark theme"
        className={`landing-theme-option${theme === 'dark' ? ' active' : ''}`}
        onClick={() => setTheme('dark')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          <path d="M19 3v4" />
          <path d="M21 5h-4" />
        </svg>
      </button>
    </div>
  )
}

const GITHUB_URL = 'https://github.com/highvoltag3/mermalaid'
const MAC_DOWNLOAD_URL = 'https://github.com/highvoltag3/mermalaid/releases/latest'

const heroHighlights = [
  'Live preview while you type',
  'Offline Mermaid editor for macOS',
  'SVG and PNG export',
  'Fast editing with Monaco and visual flowchart tools',
]

const trustSignals = [
  { label: 'Free Mermaid editor', value: 'No sign-up' },
  { label: 'Open source', value: '11 GitHub stars' },
  { label: 'Built for Mac', value: 'Native Tauri app' },
  { label: 'Local-first', value: 'Browser storage and offline Mac workflows' },
]

const previewCards = [
  {
    badge: 'Mermaid editor online',
    title: 'Open the browser editor for quick edits, links, and zero setup.',
    description:
      'Use the full-featured online editor when you want to sketch fast, share a private link, or jump into Mermaid without installing anything.',
    image: '/editor-hero-demo.svg',
    alt: 'Browser-based Mermalaid Mermaid editor with code on the left and rendered diagram preview on the right',
    ctaLabel: 'Try Online',
    ctaHref: '/editor',
    isInternal: true,
  },
  {
    badge: 'Mermaid editor for Mac',
    title: 'Install the native macOS app for local and offline diagram work.',
    description:
      'Use the Mac app when Mermaid is part of your daily workflow and you want the same editor available offline with a desktop feel.',
    image: '/visual-editor-demo.svg',
    alt: 'Native Mac-focused Mermalaid preview showing a Mermaid flowchart in the visual editor',
    ctaLabel: 'Download for Mac',
    ctaHref: MAC_DOWNLOAD_URL,
    isInternal: false,
  },
]

const benefitCards = [
  {
    eyebrow: 'Clear choice',
    title: 'One product, two workflows',
    description:
      'Mermalaid is both a Mermaid editor online and a native Mac app, so users do not have to choose between convenience and local workflows.',
  },
  {
    eyebrow: 'Credible tooling',
    title: 'Built for technical work',
    description:
      'Engineers, technical writers, and architects get code-first editing, live preview, visual flowchart editing, and export in one place.',
  },
  {
    eyebrow: 'Practical privacy',
    title: 'Local-first by default',
    description:
      'The web editor stores work in your browser, and the Mac app supports offline Mermaid editing for private or low-connectivity environments.',
  },
]

const modeCards = [
  {
    title: 'Use the online editor when you want speed',
    description:
      'The browser version is the fastest way to start diagramming. It is ideal for quick edits, reviewing Mermaid snippets, and sharing a link without asking anyone to install software.',
    bullets: ['No install required', 'Fast access from any modern browser', 'Useful for quick edits, previews, and sharing'],
    ctaLabel: 'Try Online',
    ctaHref: '/editor',
    isInternal: true,
  },
  {
    title: 'Use the native Mac app when you want local power',
    description:
      'The macOS app fits heavier Mermaid usage: offline editing, local-only workflows, and a dedicated desktop tool for engineers who work in diagrams every day.',
    bullets: ['Works as an offline Mermaid editor on macOS', 'Good fit for local files and regular usage', 'Same core editing workflow without browser lock-in'],
    ctaLabel: 'Download for Mac',
    ctaHref: MAC_DOWNLOAD_URL,
    isInternal: false,
  },
]

const featureCards = [
  {
    icon: '</>',
    title: 'Code editor built for Mermaid',
    description: 'Write Mermaid in Monaco with syntax highlighting and a fast editing surface.',
  },
  {
    icon: 'LIVE',
    title: 'Live preview',
    description: 'See diagrams update as you type so you can iterate without context switching.',
  },
  {
    icon: 'FLOW',
    title: 'Visual flowchart editing',
    description: 'Edit flowcharts visually and keep the Mermaid source in sync with your diagram.',
  },
  {
    icon: 'SAVE',
    title: 'Export and import',
    description: 'Export SVG or PNG, copy Mermaid code, and drag in existing files to continue working.',
  },
  {
    icon: 'TYPES',
    title: 'Supports the Mermaid formats teams actually use',
    description: 'Flowcharts, sequence diagrams, class diagrams, ER diagrams, state diagrams, mindmaps, Gantt, and more.',
  },
  {
    icon: 'LOCAL',
    title: 'Local-first sharing and storage',
    description: 'Keep work in the browser locally, or use private-link sharing when you need to send a diagram quickly.',
  },
]

const comparisonPoints = [
  {
    title: 'Not limited to browser-only Mermaid editors',
    description:
      'Many Mermaid tools are fine for quick browser work, but stop there. Mermalaid covers quick online edits and native Mac workflows in one tool.',
  },
  {
    title: 'Not limited to local-only desktop tools',
    description:
      'Some desktop apps work well locally but add friction when you just want to open a Mermaid editor online and start typing. Mermalaid gives you both options.',
  },
  {
    title: 'A practical Mermaid Live Editor alternative',
    description:
      'If you are comparing Mermaid live editors, Mermalaid adds a cleaner path between quick browser use, offline Mac work, visual flowchart editing, and export.',
  },
]

const comparisonRows = [
  { label: 'Use in the browser', mermalaid: 'Yes', browserOnly: 'Yes', localOnly: 'No' },
  { label: 'Use offline on Mac', mermalaid: 'Yes', browserOnly: 'Limited', localOnly: 'Yes' },
  { label: 'Switch between quick edits and heavier local work', mermalaid: 'Yes', browserOnly: 'No', localOnly: 'Limited' },
  { label: 'Open source and no sign-up for the web editor', mermalaid: 'Yes', browserOnly: 'Varies', localOnly: 'Varies' },
]

const useCases = [
  {
    title: 'Engineers',
    description:
      'Write docs-as-code, architecture diagrams, and sequence diagrams online for speed, then move to the Mac app when Mermaid becomes a daily local workflow.',
  },
  {
    title: 'Technical writers',
    description:
      'Draft and refine diagrams in the browser during content work, then use the Mac app offline when preparing documentation on the go.',
  },
  {
    title: 'System designers',
    description:
      'Model flows, services, and states with fast preview while keeping a local Mac editor ready for heavier iteration sessions.',
  },
  {
    title: 'Teams collaborating on diagrams',
    description:
      'Use the online editor for quick reviews and link-based sharing, and the Mac app for focused local editing when diagrams need deeper refinement.',
  },
]

const faqs = [
  {
    question: 'What is Mermalaid?',
    answer:
      'Mermalaid is a free Mermaid editor that works in two ways: as a Mermaid editor online in your browser and as a native macOS app for local and offline workflows.',
  },
  {
    question: 'Is Mermalaid free?',
    answer:
      'Yes. Mermalaid is free to use with no sign-up required for the web editor. The project is open source under the CC BY-NC-SA 4.0 license.',
  },
  {
    question: 'Can I use Mermalaid online?',
    answer:
      'Yes. The browser-based editor is a full-featured Mermaid editor online, so you can open it and start editing immediately without installing anything.',
  },
  {
    question: 'Does Mermalaid work offline?',
    answer:
      'Yes. Mermalaid is also available as a native Mac app, which makes it a practical offline Mermaid editor for local workflows and travel-friendly use.',
  },
  {
    question: 'Is there a Mac app?',
    answer:
      'Yes. Mermalaid includes a native macOS app built with Tauri, giving Mac users a local Mermaid editor without being limited to the browser.',
  },
  {
    question: 'Is Mermalaid a Mermaid Live Editor alternative?',
    answer:
      'Yes. If you are looking for a Mermaid Live Editor alternative, Mermalaid offers live preview in the browser plus a native Mac app for offline and local-first work.',
  },
  {
    question: 'Can I export diagrams?',
    answer:
      'Yes. Mermalaid supports exporting diagrams as SVG and PNG, which makes it useful for documentation, architecture reviews, and technical presentations.',
  },
  {
    question: 'Is Mermalaid open source?',
    answer:
      'Yes. The project is available on GitHub, so you can inspect the code, follow releases, contribute changes, and star the repository if it is useful.',
  },
]

export default function LandingPage({
  pendingRelease,
  onDismissPendingRelease,
}: LandingPageProps) {
  const shouldSkipLanding = (() => {
    try { return !!localStorage.getItem('mermalaid-has-used-editor') } catch { return false }
  })()

  if (shouldSkipLanding) return <Navigate to="/editor" replace />

  const rootRef = useRef<HTMLDivElement>(null)

  /* ─── Theme State ─── */
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('mermalaid-landing-theme')
      if (stored && THEMES.includes(stored as Theme)) return stored as Theme
    } catch { /* SSR / private browsing */ }
    return 'system'
  })

  const [resolvedDark, setResolvedDark] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('mermalaid-landing-theme', theme) } catch {}

    if (theme !== 'system') {
      setResolvedDark(theme === 'dark')
      return
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setResolvedDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setResolvedDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const sections = root.querySelectorAll('.fade-in-section')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '-60px 0px' }
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const stagger = (i: number): CSSProperties => ({
    transitionDelay: `${i * 60}ms`,
  })

  return (
    <div className={`landing${resolvedDark ? ' landing-dark' : ''}`} ref={rootRef}>
      {pendingRelease && (
        <UpdateAvailableBanner
          update={pendingRelease}
          onDismiss={onDismissPendingRelease}
          variant="landing"
          dark={resolvedDark}
        />
      )}
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-logo">
            <img src="/apple-touch-icon.png" alt="Mermalaid logo" className="landing-logo-img" width="120" height="120" />
            <span className="landing-logo-text">Mermalaid</span>
          </a>
          <div className="landing-nav-links">
            <a href="#modes">Online vs Mac</a>
            <a href="#features">Features</a>
            <a href="#compare">Compare</a>
            <a href="#faq">FAQ</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
          <Link to="/editor" className="landing-nav-cta">
            Try Online
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
              Free Mermaid editor online + native Mac app
            </div>
            <h1>Free Mermaid Editor Online and for Mac</h1>
            <p className="landing-hero-sub">
              Mermalaid is a dual-mode Mermaid editor: use it in the browser for quick edits and sharing,
              or install the native macOS app for local and offline workflows. It is fast, developer-friendly,
              and built for people who write Mermaid often.
            </p>
            <div className="landing-hero-actions">
              <Link to="/editor" className="landing-btn landing-btn-primary">
                Try Online
              </Link>
              <a href={MAC_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-secondary">
                Download for Mac
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-ghost">
                View on GitHub
              </a>
            </div>
            <ul className="landing-hero-highlights">
              {heroHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="landing-hero-privacy-note">
              Local-first workflows, open source code, and private-link sharing when you need to send a diagram.
            </p>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-dual-preview">
              <div className="landing-editor-mockup">
                <div className="landing-mockup-bar">
                  <div className="landing-mockup-dots">
                    <span /><span /><span />
                  </div>
                  <span className="landing-mockup-title">Browser editor</span>
                </div>
                <img
                  src="/editor-hero-demo.svg"
                  alt="Mermalaid online Mermaid editor with code editor and live preview"
                  className="landing-mockup-screenshot"
                />
              </div>
              <div className="landing-mini-card">
                <span className="landing-mini-card-badge">Native Mac app</span>
                <h2>Offline Mermaid editor for macOS</h2>
                <p>Use the same Mermalaid workflow in a local desktop app when you are offline or diagramming heavily.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="landing-container">
          <div className="landing-trust-strip">
            {trustSignals.map((item) => (
              <div key={item.label} className="landing-trust-item">
                <span className="landing-trust-label">{item.label}</span>
                <span className="landing-trust-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="landing-section landing-preview fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Product preview</p>
          <h2>One Mermaid editor, two ways to work</h2>
          <p className="landing-section-sub">
            Mermalaid makes the online editor and Mac app feel like one product, so users can choose the right mode for the moment instead of switching tools.
          </p>
          <div className="landing-preview-grid">
            {previewCards.map((card, i) => (
              <article key={card.title} className="landing-preview-card" style={stagger(i)}>
                <span className="landing-preview-badge">{card.badge}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="landing-preview-frame">
                  <img src={card.image} alt={card.alt} className="landing-preview-image" />
                </div>
                {card.isInternal ? (
                  <Link to={card.ctaHref} className="landing-btn landing-btn-primary">
                    {card.ctaLabel}
                  </Link>
                ) : (
                  <a href={card.ctaHref} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-secondary">
                    {card.ctaLabel}
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-benefits fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Key benefits</p>
          <h2>Clearer positioning for people comparing Mermaid editors</h2>
          <p className="landing-section-sub">
            The landing page now leads with the real differentiator: Mermalaid is both a free Mermaid editor online and a native Mac tool for offline work.
          </p>
          <div className="landing-benefits-grid">
            {benefitCards.map((card, i) => (
              <article key={card.title} className="landing-benefit-card" style={stagger(i)}>
                <span className="landing-card-eyebrow">{card.eyebrow}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="modes" className="landing-section landing-modes fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Online vs Mac app</p>
          <h2>Use it your way: online or native Mac app</h2>
          <p className="landing-section-sub">
            The web editor and the Mac app solve different moments in the same workflow. Use the browser when speed matters, and use the Mac app when local or offline work matters.
          </p>
          <div className="landing-modes-grid">
            {modeCards.map((card, i) => (
              <article key={card.title} className="landing-mode-card" style={stagger(i)}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <ul className="landing-check-list">
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                {card.isInternal ? (
                  <Link to={card.ctaHref} className="landing-btn landing-btn-primary">
                    {card.ctaLabel}
                  </Link>
                ) : (
                  <a href={card.ctaHref} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-secondary">
                    {card.ctaLabel}
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="landing-section landing-features fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Features</p>
          <h2>Everything needed in a modern Mermaid editor</h2>
          <p className="landing-section-sub">
            Mermalaid is designed for developers and technical teams who want a fast free Mermaid editor without losing power as their workflow grows.
          </p>
          <div className="landing-features-grid">
            {featureCards.map((card, i) => (
              <article key={card.title} className="landing-feature-card" style={stagger(i)}>
                <div className="landing-feature-icon" aria-hidden="true">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="compare" className="landing-section landing-compare fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Comparison</p>
          <h2>Why Mermalaid vs other Mermaid editors</h2>
          <p className="landing-section-sub">
            Mermalaid stands out because it supports both quick browser work and native Mac workflows, rather than forcing people into a single way of using Mermaid.
          </p>
          <div className="landing-compare-grid">
            {comparisonPoints.map((point, i) => (
              <article key={point.title} className="landing-compare-card" style={stagger(i)}>
                <h3>{point.title}</h3>
                <p>{point.description}</p>
              </article>
            ))}
          </div>
          <div className="landing-compare-table-wrap">
            <table className="landing-compare-table">
              <thead>
                <tr>
                  <th>What matters</th>
                  <th>Mermalaid</th>
                  <th>Browser-only editors</th>
                  <th>Local-only tools</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    <td>{row.mermalaid}</td>
                    <td>{row.browserOnly}</td>
                    <td>{row.localOnly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="landing-section landing-use-cases fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Use cases</p>
          <h2>Made for the people who work in Mermaid often</h2>
          <p className="landing-section-sub">
            Each audience can start online, move local when needed, and keep the same editor model the whole time.
          </p>
          <div className="landing-use-cases-grid">
            {useCases.map((card, i) => (
              <article key={card.title} className="landing-use-case-card" style={stagger(i)}>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section landing-faq fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Support</p>
          <h2>Frequently asked questions</h2>
          <div className="landing-faq-list">
            {faqs.map((faq, i) => (
              <details key={faq.question} className="landing-faq-item" style={stagger(i)}>
                <summary>
                  <h3>{faq.question}</h3>
                  <span className="landing-faq-chevron" aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-section landing-final-cta fade-in-section">
        <div className="landing-container">
          <img src="/apple-touch-icon.png" alt="" className="landing-cta-icon" width="80" height="80" aria-hidden="true" />
          <h2>Choose the Mermaid workflow that fits the moment</h2>
          <p>Open the free Mermaid editor online, download the native Mac app, or inspect the project on GitHub.</p>
          <div className="landing-final-actions">
            <Link to="/editor" className="landing-btn landing-btn-primary landing-btn-lg">
              Try Online
            </Link>
            <a href={MAC_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-secondary landing-btn-lg">
              Download for Mac
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-ghost landing-btn-lg">
              View on GitHub
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
            <Link to="/editor">Editor</Link>
            <a href="#modes">Online vs Mac</a>
            <a href="#features">Features</a>
            <a href="#compare">Compare</a>
            <a href="#faq">FAQ</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer">Docs</a>
          </nav>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} Mermalaid. Open source under CC BY-NC-SA 4.0.</p>
        </div>
      </footer>
    </div>
  )
}
