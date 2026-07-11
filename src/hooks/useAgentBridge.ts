import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { useToast } from './useToast'
import { getAppVersion, getAgentBridgeUrl, isAgentBridgeEnabled } from '../utils/env'
import {
  BridgeClient,
  type BridgeStatus,
  type BridgeStatusDetail,
  type DiagramState,
} from '../agentBridge/bridgeClient'
import { renderForAgent, validateMermaid } from '../agentBridge/renderForAgent'
import type { EditorCapabilities, EditorClientInfo } from '../agentBridge/protocol'

const STATE_PUSH_DEBOUNCE_MS = 300

export interface UseAgentBridgeParams {
  code: string
  setCode: (code: string) => void
  error: string | null
}

export interface AgentBridgeApi {
  enabled: boolean
  status: BridgeStatus
  detail: BridgeStatusDetail | null
  isConnected: boolean
  bridgeUrl: string
  connect: (pairingCode: string) => void
  disconnect: () => void
  reconnect: () => void
}

function buildClientInfo(): EditorClientInfo {
  return {
    app: 'mermalaid',
    appVersion: getAppVersion(),
    runtime: isTauri() ? 'tauri' : 'web',
    origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  }
}

const EDITOR_CAPABILITIES: EditorCapabilities = {
  setDiagram: true,
  getDiagram: true,
  validate: true,
  renderSvg: true,
  renderPng: true,
}

/**
 * Owns the {@link BridgeClient} and connects it to the editor's `code`/`error` state.
 * Agent writes flow through `setCode` (which the Monaco editor + preview already react to),
 * and user edits are pushed back so the agent's reads stay current.
 */
export function useAgentBridge({ code, setCode, error }: UseAgentBridgeParams): AgentBridgeApi {
  const enabled = isAgentBridgeEnabled()
  const { showToast } = useToast()
  const bridgeUrl = getAgentBridgeUrl()

  const [status, setStatus] = useState<BridgeStatus>('disconnected')
  const [detail, setDetail] = useState<BridgeStatusDetail | null>(null)

  const clientRef = useRef<BridgeClient | null>(null)
  const codeRef = useRef(code)
  const errorRef = useRef(error)
  const setCodeRef = useRef(setCode)
  const showToastRef = useRef(showToast)
  const prevStatusRef = useRef<BridgeStatus>('disconnected')
  const pendingSourceRef = useRef<'user' | 'agent'>('user')

  useEffect(() => {
    codeRef.current = code
  }, [code])
  useEffect(() => {
    errorRef.current = error
  }, [error])
  useEffect(() => {
    setCodeRef.current = setCode
  }, [setCode])
  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  const getState = useCallback(
    (): DiagramState => ({
      code: codeRef.current,
      valid: errorRef.current === null,
      error: errorRef.current,
    }),
    [],
  )

  const applyDiagram = useCallback(async (newCode: string): Promise<DiagramState> => {
    pendingSourceRef.current = 'agent'
    setCodeRef.current(newCode)
    // Report validity from a headless parse of the applied source — deterministic, and not
    // coupled to the visible preview's async render timing.
    const outcome = await validateMermaid(newCode)
    return { code: newCode, valid: outcome.valid, error: outcome.error }
  }, [])

  const handleStatus = useCallback((next: BridgeStatus, nextDetail?: BridgeStatusDetail) => {
    const prev = prevStatusRef.current
    prevStatusRef.current = next
    setStatus(next)
    setDetail(nextDetail ?? null)

    const toast = showToastRef.current
    if (next === 'connected' && prev !== 'connected') {
      toast('Connected to AI agent')
    } else if (next === 'rejected') {
      toast(
        nextDetail?.reason === 'bad_pairing_code'
          ? 'Pairing failed: incorrect code'
          : `Agent bridge rejected the connection${nextDetail?.message ? `: ${nextDetail.message}` : ''}`,
        'error',
      )
    } else if (next === 'superseded') {
      toast('Another Mermalaid tab took over the agent connection', 'error')
    } else if (next === 'disconnected' && prev === 'connected') {
      toast('Disconnected from AI agent')
    }
  }, [])

  const connect = useCallback(
    (pairingCode: string) => {
      clientRef.current?.disconnect()
      const client = new BridgeClient({
        url: bridgeUrl,
        pairingCode,
        clientInfo: buildClientInfo(),
        capabilities: EDITOR_CAPABILITIES,
        handlers: {
          getState,
          applyDiagram,
          validate: validateMermaid,
          render: renderForAgent,
          onStatus: handleStatus,
        },
      })
      clientRef.current = client
      client.connect()
    },
    [bridgeUrl, getState, applyDiagram, handleStatus],
  )

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
  }, [])

  const reconnect = useCallback(() => {
    clientRef.current?.connect()
  }, [])

  // Push editor state to the agent (debounced) while connected.
  useEffect(() => {
    if (status !== 'connected') return
    const client = clientRef.current
    if (!client) return
    const timer = setTimeout(() => {
      const source = pendingSourceRef.current
      pendingSourceRef.current = 'user'
      client.pushState(
        { code: codeRef.current, valid: errorRef.current === null, error: errorRef.current },
        source,
      )
    }, STATE_PUSH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [code, error, status])

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect()
      clientRef.current = null
    }
  }, [])

  return useMemo(
    () => ({
      enabled,
      status,
      detail,
      isConnected: status === 'connected',
      bridgeUrl,
      connect,
      disconnect,
      reconnect,
    }),
    [enabled, status, detail, bridgeUrl, connect, disconnect, reconnect],
  )
}
