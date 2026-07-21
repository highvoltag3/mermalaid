import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { SetDiagramResultMessage } from './protocol.js'
import { formatPairingCode } from './pairing.js'
import {
  BridgeNotConnectedError,
  BridgeTimeoutError,
  type BridgeSession,
} from './session.js'
import { getSyntaxEntry, getSyntaxIndex } from './syntaxReference.js'

export interface ToolContext {
  session: BridgeSession
  pairingCode: string
  port: number
}

function json(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

function errorText(text: string): CallToolResult {
  return { content: [{ type: 'text', text }], isError: true }
}

/** Shared result shape for tools that apply a diagram and report post-apply validity. */
function applyResultJson(res: SetDiagramResultMessage, invalidNote: string): CallToolResult {
  return res.valid
    ? json({ ok: true, revision: res.rev, valid: true })
    : json({ ok: true, revision: res.rev, valid: false, error: res.error, note: invalidNote })
}

function pairingInstructions(ctx: ToolContext): string {
  return [
    'No Mermalaid editor is connected yet. Ask the user to:',
    '  1. Open Mermalaid — the desktop app, or https://mermalaid.com/editor in Chrome/Edge (a local dev server works too).',
    '  2. Click the "AI Agent" button in the toolbar.',
    `  3. Enter the pairing code: ${formatPairingCode(ctx.pairingCode)}`,
    'Then retry this tool.',
  ].join('\n')
}

function toToolError(err: unknown, ctx: ToolContext): CallToolResult {
  if (err instanceof BridgeNotConnectedError) return errorText(pairingInstructions(ctx))
  if (err instanceof BridgeTimeoutError) {
    return errorText(`The editor did not respond in time (${err.message}). It may be busy, mid-render, or disconnected — try again in a moment.`)
  }
  return errorText(`Bridge error: ${err instanceof Error ? err.message : String(err)}`)
}

/** Register the milestone-1 tool surface (status / pairing / read / write). */
export function registerTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'get_connection_status',
    {
      title: 'Get connection status',
      description:
        'Check whether a Mermalaid editor is connected and paired with this agent. When not paired, the response includes the pairing code to give the user.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const st = ctx.session.status()
      return json({
        paired: st.paired,
        editor: st.editorInfo,
        pairingCode: st.paired ? undefined : formatPairingCode(ctx.pairingCode),
        bridgePort: ctx.port,
        lastKnownRevision: st.lastRevision,
        lastKnownValid: st.lastValid,
      })
    },
  )

  server.registerTool(
    'get_pairing_code',
    {
      title: 'Get pairing code',
      description:
        "Return the pairing code the user must type into Mermalaid's AI Agent panel to connect the live editor to this agent. Tell the user this code.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      json({
        pairingCode: formatPairingCode(ctx.pairingCode),
        bridgePort: ctx.port,
        instructions:
          'In Mermalaid, click the "AI Agent" button in the toolbar and enter this code to connect the live editor.',
      }),
  )

  server.registerTool(
    'wait_for_editor',
    {
      title: 'Wait for editor to connect',
      description:
        'Block until a Mermalaid editor connects and pairs, or until the timeout elapses. Use right after telling the user the pairing code.',
      inputSchema: {
        timeoutMs: z
          .number()
          .int()
          .positive()
          .max(600_000)
          .optional()
          .describe('How long to wait for the editor to pair. Default 120000 (2 min).'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ timeoutMs }) => {
      try {
        await ctx.session.waitForEditor(timeoutMs ?? 120_000)
        const st = ctx.session.status()
        return json({ paired: true, editor: st.editorInfo })
      } catch {
        return errorText(`No editor paired within the timeout.\n\n${pairingInstructions(ctx)}`)
      }
    },
  )

  server.registerTool(
    'get_diagram',
    {
      title: 'Get current diagram',
      description:
        'Read the current Mermaid source from the connected editor, plus whether it currently renders without errors. Served from the live cache; pass fresh=true to force a round-trip.',
      inputSchema: {
        fresh: z
          .boolean()
          .optional()
          .describe('Force a fresh read from the editor instead of the cached last-known state.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ fresh }) => {
      try {
        const d = await ctx.session.getDiagram(fresh ?? false)
        return json({ code: d.code, revision: d.rev, valid: d.valid, error: d.error })
      } catch (err) {
        return toToolError(err, ctx)
      }
    },
  )

  server.registerTool(
    'set_diagram',
    {
      title: 'Set diagram',
      description:
        "Replace the entire Mermaid diagram in the connected editor. The change appears live in the user's editor. Returns whether the new diagram renders without errors — if not, fix the syntax and call again.",
      inputSchema: {
        code: z.string().describe('The full Mermaid diagram source to place in the editor.'),
        reason: z
          .string()
          .optional()
          .describe('Short human-readable note about the change (may be shown to the user).'),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ code, reason }) => {
      try {
        const res = await ctx.session.setDiagram(code, reason)
        return applyResultJson(
          res,
          'The diagram was placed in the editor but does not render yet. Fix the error and call set_diagram again.',
        )
      } catch (err) {
        return toToolError(err, ctx)
      }
    },
  )

  server.registerTool(
    'append_to_diagram',
    {
      title: 'Append to diagram',
      description:
        'Append text to the end of the current diagram (e.g. add a node or edge) without resending the whole source. Reads the current diagram, appends, and applies it live. Returns post-apply validity.',
      inputSchema: {
        content: z.string().describe('Text to append to the end of the current Mermaid source.'),
        separator: z
          .string()
          .optional()
          .describe('Separator between the existing source and the appended text. Default is a newline.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ content, separator }) => {
      try {
        const current = await ctx.session.getDiagram(true)
        const base = current.code.replace(/\n+$/, '')
        const combined = base.length ? `${base}${separator ?? '\n'}${content}` : content
        const res = await ctx.session.setDiagram(combined, 'append')
        return applyResultJson(res, 'Appended, but the diagram does not render yet. Fix the error and try again.')
      } catch (err) {
        return toToolError(err, ctx)
      }
    },
  )

  server.registerTool(
    'validate_diagram',
    {
      title: 'Validate diagram',
      description:
        "Check whether Mermaid source is syntactically valid, using the connected editor's Mermaid engine. Validates the given code, or the current diagram when code is omitted.",
      inputSchema: {
        code: z
          .string()
          .optional()
          .describe('Mermaid source to validate. Omit to validate the current diagram.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ code }) => {
      try {
        const res = await ctx.session.validate(code)
        return json({ valid: res.valid, error: res.error, diagramType: res.diagramType ?? null })
      } catch (err) {
        return toToolError(err, ctx)
      }
    },
  )

  server.registerTool(
    'render_diagram',
    {
      title: 'Render diagram',
      description:
        'Render the diagram to an image via the connected editor so you can see the result. PNG returns an image you can view; SVG returns markup. Renders the given code, or the current diagram when omitted.',
      inputSchema: {
        code: z.string().optional().describe('Mermaid source to render. Omit to render the current diagram.'),
        format: z.enum(['svg', 'png']).optional().describe('Output format. Default png.'),
        scale: z.number().min(1).max(4).optional().describe('PNG scale factor (1–4). Default 2.'),
        theme: z.string().optional().describe('Optional Mermaid theme, e.g. "dark".'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ code, format, scale, theme }) => {
      const fmt = format ?? 'png'
      try {
        const res = await ctx.session.render(fmt, { code, scale, theme })
        if (!res.ok) return errorText(`Render failed: ${res.error ?? 'unknown error'}`)
        if (fmt === 'svg') {
          return { content: [{ type: 'text', text: res.data }] }
        }
        return {
          content: [
            { type: 'image', data: res.data, mimeType: res.mimeType },
            { type: 'text', text: `Rendered ${res.width ?? '?'}×${res.height ?? '?'}px PNG.` },
          ],
        }
      } catch (err) {
        return toToolError(err, ctx)
      }
    },
  )

  server.registerTool(
    'get_syntax_reference',
    {
      title: 'Get Mermaid syntax reference',
      description:
        'Get a concise Mermaid syntax cheat-sheet for a diagram type (flowchart, sequence, class, state, er, gantt, pie, mindmap, journey, gitgraph). Omit diagramType for the index of available types. Use this before authoring a diagram to avoid syntax errors. Answered locally — no editor needed.',
      inputSchema: {
        diagramType: z
          .string()
          .optional()
          .describe('Diagram type, e.g. "flowchart" or "sequence". Omit for the index.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ diagramType }) => {
      if (!diagramType) return json(getSyntaxIndex())
      const entry = getSyntaxEntry(diagramType)
      if (!entry) {
        return json({
          error: `No cheat-sheet for "${diagramType}".`,
          ...getSyntaxIndex(),
        })
      }
      return json(entry)
    },
  )
}
