import { describe, expect, it } from 'vitest'
import {
  MessageType,
  PROTOCOL_VERSION,
  parseBridgeMessage,
  serializeBridgeMessage,
  type WelcomeMessage,
} from './protocol.js'

describe('protocol', () => {
  it('pins the protocol version', () => {
    expect(PROTOCOL_VERSION).toBe(1)
  })

  it('round-trips a message through serialize/parse', () => {
    const msg: WelcomeMessage = {
      v: PROTOCOL_VERSION,
      type: MessageType.Welcome,
      sessionId: 's1',
      serverInfo: { name: 'mermalaid-mcp', version: '0.1.0' },
      protocolVersion: PROTOCOL_VERSION,
      heartbeatIntervalMs: 15000,
    }
    const parsed = parseBridgeMessage(serializeBridgeMessage(msg))
    expect(parsed).toEqual(msg)
  })

  it('parses a well-formed envelope', () => {
    const parsed = parseBridgeMessage('{"v":1,"type":"hello","pairingCode":"X"}')
    expect(parsed?.type).toBe('hello')
  })

  it('rejects non-JSON, non-objects, and envelopes missing v/type', () => {
    expect(parseBridgeMessage('not json')).toBeNull()
    expect(parseBridgeMessage('42')).toBeNull()
    expect(parseBridgeMessage('null')).toBeNull()
    expect(parseBridgeMessage('{"type":"hello"}')).toBeNull() // missing v
    expect(parseBridgeMessage('{"v":1}')).toBeNull() // missing type
  })
})
