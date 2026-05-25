function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === './') return ''

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export function publicAssetPath(path: string): string {
  const cleanPath = path.replace(/^\/+/, '')
  return `${normalizeBasePath(import.meta.env.BASE_URL)}${cleanPath}`
}

export function routerBasename(): string | undefined {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL)
  if (!basePath || basePath === '/') return undefined
  return basePath.replace(/\/$/, '')
}
