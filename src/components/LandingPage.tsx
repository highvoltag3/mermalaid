import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import './LandingPage.css'

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
      style={{ '--ts-index': activeIndex } as React.CSSProperties}
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

const heroFeatures = [
  {
    icon: '</>',
    title: 'Monaco Code Editor',
    description: 'The same editor that powers VS Code. Full syntax highlighting, autocomplete, and error detection for Mermaid syntax.',
  },
  {
    icon: '\u25B6',
    title: 'Live Preview',
    description: 'See your diagrams render in real-time as you type. Instant feedback with debounced updates for a smooth experience.',
  },
  {
    icon: '\u25C7',
    title: 'Visual Drag & Drop Editor',
    description: 'Edit flowcharts visually. Drag nodes, draw connections, and double-click to edit labels \u2014 all synced back to code.',
  },
  {
    icon: '\u2197',
    title: 'Export SVG & PNG',
    description: 'Export your diagrams as crisp SVG vectors or high-resolution PNG images. Perfect for documentation and presentations.',
  },
]

const compactFeatures = [
  {
    icon: '\u25D0',
    title: 'Dark & Light Themes',
    description: 'Multiple themes including default, dark, forest, and neutral.',
  },
  {
    icon: '\u2726',
    title: 'AI Error Fixer',
    description: 'AI analyzes syntax errors and suggests fixes preserving your intent.',
  },
  {
    icon: '\u21BB',
    title: 'Auto-Save & Local Storage',
    description: 'Saved to your browser \u2014 your data never leaves your device.',
  },
  {
    icon: '\u2193',
    title: 'Drag & Drop Import',
    description: 'Drop .mmd, .txt, or .md files directly into the editor.',
  },
]

const diagramTypes = [
  { name: 'Flowcharts', description: 'Decision trees, processes, and workflows', code: 'graph TD' },
  { name: 'Sequence Diagrams', description: 'Interaction between systems and APIs', code: 'sequenceDiagram' },
  { name: 'Class Diagrams', description: 'OOP structures and relationships', code: 'classDiagram' },
  { name: 'State Diagrams', description: 'State machines and transitions', code: 'stateDiagram-v2' },
  { name: 'ER Diagrams', description: 'Database schemas and relations', code: 'erDiagram' },
  { name: 'Gantt Charts', description: 'Project timelines and scheduling', code: 'gantt' },
  { name: 'Pie Charts', description: 'Data distribution visualization', code: 'pie' },
  { name: 'Git Graphs', description: 'Branch and merge visualization', code: 'gitGraph' },
  { name: 'User Journeys', description: 'Customer experience mapping', code: 'journey' },
  { name: 'Mindmaps', description: 'Brainstorming and idea organization', code: 'mindmap' },
]

const stats = [
  { value: '0', label: 'sign-ups required', detail: 'Start creating instantly' },
  { value: '100%', label: 'local & private', detail: 'Nothing leaves your device' },
  { value: '10+', label: 'diagram types', detail: 'Every Mermaid type supported' },
  { value: '\u221E', label: 'open source forever', detail: 'CC BY-NC-SA 4.0 license' },
]

const faqs = [
  {
    question: 'Is Mermalaid really free?',
    answer: 'Yes, Mermalaid is 100% free with no hidden costs, no premium tiers, and no usage limits. Create unlimited Mermaid diagrams without ever paying a cent. The project is open source under the CC BY-NC-SA 4.0 license.',
  },
  {
    question: 'Do I need to create an account to use Mermalaid?',
    answer: 'No. Mermalaid requires zero sign-up. Just open the editor and start creating diagrams immediately. Your work is saved locally in your browser \u2014 no accounts, no cloud storage, no tracking.',
  },
  {
    question: 'What types of Mermaid diagrams can I create?',
    answer: 'Mermalaid supports all Mermaid.js diagram types including flowcharts, sequence diagrams, class diagrams, state diagrams, entity relationship diagrams, Gantt charts, pie charts, git graphs, user journeys, mindmaps, and more.',
  },
  {
    question: 'Can I export my diagrams?',
    answer: 'Yes. Export your diagrams as SVG (scalable vector graphics) for crisp rendering at any size, or PNG for raster images. You can also copy the raw Mermaid code to your clipboard with markdown formatting.',
  },
  {
    question: 'What is the visual editor?',
    answer: 'The visual editor lets you edit flowcharts by dragging and dropping nodes, drawing connections between them, and double-clicking to edit labels. Changes are automatically synced back to the Mermaid code, giving you both visual and code-based editing.',
  },
  {
    question: 'Is Mermalaid open source?',
    answer: 'Yes. Mermalaid is fully open source and available on GitHub. You can inspect the code, contribute improvements, or fork the project for your own use.',
  },
  {
    question: 'What is Mermaid.js?',
    answer: 'Mermaid.js is a JavaScript library that lets you create diagrams and charts from text-based definitions, similar to Markdown. Instead of using a drag-and-drop tool, you write simple text that gets rendered into professional diagrams. Mermalaid provides the best free editor for writing and previewing Mermaid syntax.',
  },
  {
    question: 'Does Mermalaid work offline?',
    answer: 'Mermalaid is also available as a lightweight native macOS desktop app built with Tauri. The desktop version is under 10MB and works completely offline, while offering the exact same features as the web version.',
  },
]

export default function LandingPage() {
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

  const stagger = (i: number): React.CSSProperties => ({
    transitionDelay: `${i * 60}ms`,
  })

  return (
    <div className={`landing${resolvedDark ? ' landing-dark' : ''}`} ref={rootRef}>
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="/" className="landing-logo">
            <img src="/apple-touch-icon.png" alt="Mermalaid" className="landing-logo-img" width="120" height="120" />
            <span className="landing-logo-text">Mermalaid</span>
          </a>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#diagrams">Diagrams</a>
            <a href="#faq">FAQ</a>
            <a href="https://github.com/highvoltag3/mermalaid" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
          <Link to="/editor" className="landing-nav-cta">
            Open Editor
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
              Open Source &middot; 100% Free &middot; No Sign-Up
            </div>
            <p className="landing-hero-privacy-note">
              Your diagrams never leave your device. No tracking, no cloud, no analytics.
            </p>
            <h1>The Free Mermaid Diagram Editor You&rsquo;ve Been Looking For</h1>
            <p className="landing-hero-sub">
              Create flowcharts, sequence diagrams, class diagrams, and more with the most powerful
              free Mermaid editor online. Live preview, visual drag-and-drop editing, SVG &amp; PNG export
              &mdash; all without creating an account.
            </p>
            <div className="landing-hero-actions">
              <Link to="/editor" className="landing-btn landing-btn-primary">
                Start Creating &mdash; It&rsquo;s Free
              </Link>
              <a href="https://github.com/highvoltag3/mermalaid" target="_blank" rel="noopener noreferrer" className="landing-btn landing-btn-ghost">
                View on GitHub
              </a>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-editor-mockup">
              <div className="landing-mockup-bar">
                <div className="landing-mockup-dots">
                  <span /><span /><span />
                </div>
                <span className="landing-mockup-title">mermalaid</span>
              </div>
              <img
                src="/editor-hero-demo.svg"
                alt="Mermalaid editor showing Mermaid code on the left and a rendered flowchart diagram on the right"
                className="landing-mockup-screenshot"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="landing-section landing-features fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Capabilities</p>
          <h2>Everything You Need to Create Mermaid Diagrams</h2>
          <p className="landing-section-sub">
            A professional-grade Mermaid editor with features that rival paid tools &mdash; completely free and open source.
          </p>
          <div className="landing-features-hero-grid">
            {heroFeatures.map((f, i) => (
              <article key={f.title} className="landing-feature-card landing-feature-card-hero" style={stagger(i)}>
                <div className="landing-feature-icon" aria-hidden="true">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
          <div className="landing-features-compact-strip">
            {compactFeatures.map((f, i) => (
              <article key={f.title} className="landing-feature-card landing-feature-card-compact" style={stagger(i + 4)}>
                <div className="landing-feature-icon" aria-hidden="true">{f.icon}</div>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Editor Showcase */}
      <section className="landing-section landing-visual-editor fade-in-section">
        <div className="landing-container">
          <div className="landing-visual-editor-layout">
            <div className="landing-visual-editor-text">
              <p className="landing-section-label">Visual Mode</p>
              <h2>Visual Drag &amp; Drop Flowchart Editor</h2>
              <p>
                Don&rsquo;t want to write code? Use the visual editor to build flowcharts by dragging
                nodes, drawing connections, and editing labels with a double-click. Every change
                syncs back to Mermaid code automatically.
              </p>
              <ul className="landing-check-list">
                <li>Drag and reposition nodes freely</li>
                <li>Draw connections between any nodes</li>
                <li>Double-click to edit node and edge labels</li>
                <li>Supports all Mermaid node shapes</li>
                <li>Auto-syncs visual changes to code</li>
              </ul>
              <Link to="/editor" className="landing-btn landing-btn-primary">Try the Visual Editor</Link>
            </div>
            <div className="landing-visual-editor-demo">
              <div className="landing-ve-canvas">
                <img src="/visual-editor-demo.svg" alt="Mermaid flowchart rendered in Mermalaid visual editor showing Start, Decision, Action 1, Action 2, and End nodes with Yes/No branches" className="landing-ve-diagram" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diagram Types */}
      <section id="diagrams" className="landing-section landing-diagrams fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label landing-section-label-light">Supported Types</p>
          <h2>All Mermaid Diagram Types Supported</h2>
          <p className="landing-section-sub">
            From simple flowcharts to complex entity-relationship diagrams &mdash; create any diagram that Mermaid.js supports.
          </p>
          <div className="landing-diagrams-grid">
            {diagramTypes.map((d, i) => (
              <div key={d.name} className="landing-diagram-card" style={stagger(i)}>
                <code className="landing-diagram-code">{d.code}</code>
                <h3>{d.name}</h3>
                <p>{d.description}</p>
                <span className="landing-diagram-hint">Try it in the editor &rarr;</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Mermalaid — Stat Cards */}
      <section className="landing-section landing-why fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Comparison</p>
          <h2>Why Developers Choose Mermalaid</h2>
          <p className="landing-section-sub">
            Most free Mermaid editors are either too basic or want you to sign up. Mermalaid gives you professional features with zero friction.
          </p>
          <div className="landing-stats-grid">
            {stats.map((s, i) => (
              <div key={s.label} className="landing-stat-card" style={stagger(i)}>
                <span className="landing-stat-value">{s.value}</span>
                <span className="landing-stat-label">{s.label}</span>
                <span className="landing-stat-detail">{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section landing-faq fade-in-section">
        <div className="landing-container">
          <p className="landing-section-label">Support</p>
          <h2>Frequently Asked Questions</h2>
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
          <h2>Start Creating Mermaid Diagrams Now</h2>
          <p>No sign-up. No payment. No limits. Just open the editor and start diagramming.</p>
          <Link to="/editor" className="landing-btn landing-btn-primary landing-btn-lg">
            Open the Free Editor
          </Link>
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
            <a href="#features">Features</a>
            <a href="#diagrams">Diagrams</a>
            <a href="#faq">FAQ</a>
            <a href="https://github.com/highvoltag3/mermalaid" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer">Docs</a>
          </nav>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} Mermalaid. Open source under CC BY-NC-SA 4.0.</p>
        </div>
      </footer>
    </div>
  )
}
