import { createContext, type ReactNode } from 'react'
import type { AgentBridgeApi } from '../hooks/useAgentBridge'

/**
 * Carries the agent-bridge state/actions from `EditorView` (which owns the diagram code)
 * down to the Toolbar status indicator and pairing panel, without threading new props
 * through the already-large Toolbar.
 */
export const AgentBridgeContext = createContext<AgentBridgeApi | null>(null)

export function AgentBridgeProvider({
  value,
  children,
}: {
  value: AgentBridgeApi
  children: ReactNode
}) {
  return <AgentBridgeContext.Provider value={value}>{children}</AgentBridgeContext.Provider>
}
