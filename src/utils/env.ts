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

import { APP_VERSION } from '../version'

/**
 * Get application version from environment variables
 * Falls back to package.json version (see version.ts)
 */
export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || APP_VERSION
}

/**
 * Check if AI fixer feature is enabled
 */
export function isAIFixerEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_AI_FIXER !== 'false'
}

/**
 * Check if the live AI Agent bridge (local MCP WebSocket) feature is enabled.
 * Enabled by default; set VITE_ENABLE_AGENT_BRIDGE=false to hide it.
 */
export function isAgentBridgeEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_AGENT_BRIDGE !== 'false'
}

/** Host the editor dials for the local agent bridge (loopback only). */
export function getAgentBridgeHost(): string {
  return import.meta.env.VITE_AGENT_BRIDGE_HOST || '127.0.0.1'
}

/** Port the editor dials for the local agent bridge (matches the mermalaid-mcp default). */
export function getAgentBridgePort(): number {
  const raw = import.meta.env.VITE_AGENT_BRIDGE_PORT
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 7337
}

/** Full ws:// URL for the local agent bridge. */
export function getAgentBridgeUrl(): string {
  return `ws://${getAgentBridgeHost()}:${getAgentBridgePort()}`
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
