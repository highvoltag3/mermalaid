/**
 * Environment variable utilities
 * 
 * In Vite, environment variables must be prefixed with VITE_ to be exposed to the client
 * Access them via import.meta.env.VITE_* or use these helper functions
 */

/**
 * Get OpenAI API key from environment variables
 * Returns undefined if not set (feature is optional)
 */
export function getOpenAIApiKey(): string | undefined {
  return import.meta.env.VITE_OPENAI_API_KEY
}

/**
 * Get application name from environment variables
 * Falls back to default if not set
 */
export function getAppName(): string {
  return import.meta.env.VITE_APP_NAME || 'Mermalaid'
}

/**
 * Get application version from environment variables
 * Falls back to package.json version
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '1.0.0'
}

/**
 * Check if AI fixer feature is enabled
 */
export function isAIFixerEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_AI_FIXER !== 'false'
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
}

/**
 * Get analytics ID if enabled
 */
export function getAnalyticsId(): string | undefined {
  return import.meta.env.VITE_ANALYTICS_ID
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV === true
}
