import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SubscribeRequestSchema, UnsubscribeRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { BridgeSession } from './session.js'

export const DIAGRAM_RESOURCE_URI = 'mermalaid://diagram/current'
const DIAGRAM_MIME = 'text/vnd.mermaid'

/**
 * Exposes the live diagram as an MCP resource so users can @-mention / attach it in clients
 * like Claude Desktop. The high-level McpServer wires resources/read + list but not
 * subscribe, so this also registers subscribe/unsubscribe and pushes `resources/updated`
 * whenever the diagram changes.
 */
export function registerDiagramResource(server: McpServer, session: BridgeSession): void {
  server.registerResource(
    'current-diagram',
    DIAGRAM_RESOURCE_URI,
    {
      title: 'Current Mermalaid diagram',
      description:
        'The Mermaid source currently open in the connected Mermalaid editor. Reflects live edits from the user and the agent.',
      mimeType: DIAGRAM_MIME,
    },
    async (uri) => {
      const cached = session.getCachedDiagram()
      const text = cached
        ? cached.code
        : session.isPaired
          ? '%% The Mermalaid editor is connected but has not sent its diagram yet.'
          : '%% No Mermalaid editor is connected. Open Mermalaid and pair the AI Agent panel.'
      return { contents: [{ uri: uri.toString(), mimeType: DIAGRAM_MIME, text }] }
    },
  )

  const subscribers = new Set<string>()
  server.server.registerCapabilities({ resources: { subscribe: true } })
  server.server.setRequestHandler(SubscribeRequestSchema, async (request) => {
    subscribers.add(request.params.uri)
    return {}
  })
  server.server.setRequestHandler(UnsubscribeRequestSchema, async (request) => {
    subscribers.delete(request.params.uri)
    return {}
  })

  session.onStateChange(() => {
    if (!subscribers.has(DIAGRAM_RESOURCE_URI)) return
    void server.server.sendResourceUpdated({ uri: DIAGRAM_RESOURCE_URI }).catch(() => {})
  })
}
