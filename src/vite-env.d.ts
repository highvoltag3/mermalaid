/// <reference types="vite/client" />

interface ImportMetaEnv {
  // OpenAI API Configuration
  readonly VITE_OPENAI_API_KEY?: string

  // Application Configuration
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_VERSION?: string
  /** Optional `owner/repo` for GitHub releases API (defaults to highvoltag3/mermalaid) */
  readonly VITE_GITHUB_REPO?: string

  // Analytics
  readonly VITE_ANALYTICS_ID?: string
  readonly VITE_ENABLE_ANALYTICS?: string

  // Feature Flags
  readonly VITE_ENABLE_AI_FIXER?: string

  /** Public web origin for private share links in the desktop app (default: mermalaid.com). */
  readonly VITE_PUBLIC_SHARE_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
