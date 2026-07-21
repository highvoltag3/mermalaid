import { useContext } from 'react'
import { AgentBridgeContext } from '../contexts/AgentBridgeContext'
import type { AgentBridgeApi } from './useAgentBridge'

/** Access the agent bridge, or null when no provider is mounted (feature unavailable). */
export function useAgentBridgeContext(): AgentBridgeApi | null {
  return useContext(AgentBridgeContext)
}
