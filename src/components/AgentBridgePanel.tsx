import { useEffect, useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import { useAgentBridgeContext } from '../hooks/useAgentBridgeContext'
import { isAppThemeDark } from '../utils/mermaidThemes'
import type { BridgeStatus } from '../agentBridge/bridgeClient'
import './Settings.css'
import './AgentBridgePanel.css'

interface AgentBridgePanelProps {
  isOpen: boolean
  onClose: () => void
}

const STATUS_LABEL: Record<BridgeStatus, string> = {
  disconnected: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  rejected: 'Pairing failed',
  superseded: 'Taken over by another tab',
  error: 'Connection problem',
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua)
}

export default function AgentBridgePanel({ isOpen, onClose }: AgentBridgePanelProps) {
  const { mermaidTheme } = useTheme()
  const bridge = useAgentBridgeContext()
  const [pairingCode, setPairingCode] = useState('')

  useEffect(() => {
    if (isOpen) setPairingCode('')
  }, [isOpen])

  if (!isOpen || !bridge) return null

  const { status, detail, isConnected } = bridge
  const canSubmit = pairingCode.trim().length > 0 && status !== 'connecting'

  const handleConnect = () => {
    if (!canSubmit) return
    bridge.connect(pairingCode.trim())
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`settings-modal ${isAppThemeDark(mermaidTheme) ? 'dark' : 'light'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h2>AI Agent</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <div className={`agent-status agent-status-${status}`}>
              <span className="agent-status-dot" aria-hidden="true" />
              <span className="agent-status-label">{STATUS_LABEL[status]}</span>
            </div>

            {isConnected ? (
              <p className="settings-description">
                An AI agent is connected to this editor. It can read the current diagram and
                update it live — you'll see its changes appear here. Keep editing; the agent sees
                your changes too.
              </p>
            ) : (
              <p className="settings-description">
                Let an AI agent (Claude Desktop, Claude Code, Cursor…) create and iterate on this
                diagram with you, live. Start the <code>mermalaid-mcp</code> server in your agent,
                then enter the pairing code it gives you.
              </p>
            )}

            {status === 'rejected' && detail?.reason === 'bad_pairing_code' && (
              <p className="agent-error-note">
                That code didn't match. Ask the agent for the current pairing code (it changes each
                time the server restarts) and try again.
              </p>
            )}
            {status === 'superseded' && (
              <p className="agent-error-note">
                Another Mermalaid tab or window connected to the agent. Only one editor can be live
                at a time. Reconnect here to take over.
              </p>
            )}

            {!isConnected && (
              <div className="settings-field">
                <label htmlFor="agent-pairing-code">Pairing code</label>
                <input
                  id="agent-pairing-code"
                  className="agent-code-input"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="XXXX-XXXX"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConnect()
                  }}
                />
                <p className="settings-hint">
                  The agent prints this code when it starts (also via its{' '}
                  <code>get_pairing_code</code> tool). Connecting to <code>{bridge.bridgeUrl}</code>.
                </p>
              </div>
            )}

            {!isConnected && (
              <ol className="agent-steps">
                <li>
                  Register the server with your agent, e.g. Claude Code:
                  <br />
                  <code>claude mcp add mermalaid -- npx mermalaid-mcp</code>
                </li>
                <li>Ask the agent for the pairing code (or read it from the server logs).</li>
                <li>Enter it above and click Connect.</li>
              </ol>
            )}

            {isSafari() && (
              <p className="agent-error-note">
                Heads up: Safari blocks connections to a local server from an <code>https</code>{' '}
                page. Use the Mermalaid desktop app or Chrome/Edge for the live agent bridge.
              </p>
            )}
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="button-secondary">
            Close
          </button>
          <div>
            {isConnected ? (
              <button onClick={() => bridge.disconnect()} className="button-secondary">
                Disconnect
              </button>
            ) : status === 'superseded' || status === 'rejected' || status === 'error' ? (
              <>
                <button
                  onClick={() => bridge.reconnect()}
                  className="button-secondary"
                  title="Retry with the last code"
                >
                  Reconnect
                </button>
                <button onClick={handleConnect} className="button-primary" disabled={!canSubmit}>
                  Connect
                </button>
              </>
            ) : (
              <button onClick={handleConnect} className="button-primary" disabled={!canSubmit}>
                {status === 'connecting' ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
