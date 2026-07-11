# AI Agent Integration (live shared editor over MCP)

Let an AI agent — Claude Desktop, Claude Code, Cursor, or anything that speaks the
[Model Context Protocol](https://modelcontextprotocol.io) — create and iterate on a diagram
**with you, live**. The agent's edits appear instantly in your open Mermalaid editor, and your
own edits are visible to the agent.

Everything runs on your machine. No cloud, no account, nothing leaves your device.

## Overview

```
Claude Desktop / Claude Code / Cursor
   ⇄ (MCP over stdio)   mermalaid-mcp          ← a small local server the agent starts
        ⇄ (ws://127.0.0.1:7337)   your open Mermalaid editor (desktop app or Chrome tab)
```

`mermalaid-mcp` is a local Node server. Your agent launches it over stdio; it also hosts a
loopback WebSocket that the Mermalaid editor connects to. A short **pairing code** links the two
so that only your editor can be driven.

## Prerequisites

- Node.js `>= 20.19`.
- An MCP-capable agent: Claude Desktop, Claude Code, or Cursor.
- Mermalaid open in a supported surface (see [Browser support](#browser-support)).

## Quick start

1. **Build the server** (from the repo root):

   ```bash
   npm run mcp:build
   ```

   This installs and compiles the `mcp/` package to `mcp/dist`.

2. **Register it with your agent.** For Claude Code:

   ```bash
   claude mcp add mermalaid -- node /absolute/path/to/mermalaid/mcp/dist/index.js
   ```

   For Claude Desktop / Cursor, add to the MCP servers config:

   ```json
   {
     "mcpServers": {
       "mermalaid": {
         "command": "node",
         "args": ["/absolute/path/to/mermalaid/mcp/dist/index.js"]
       }
     }
   }
   ```

3. **Open Mermalaid**, click **AI Agent** in the toolbar.

4. **Ask the agent for the pairing code** (it also prints to the server logs), enter it in the
   panel, and click **Connect**. The status dot turns green.

5. **Collaborate.** Ask the agent to draw or change the diagram — it appears live. Keep editing;
   the agent sees your changes too.

## MCP tools

| Tool | What it does |
|---|---|
| `get_connection_status` | Whether an editor is paired; returns the pairing code if not. |
| `get_pairing_code` | The code the user types into the AI Agent panel. |
| `wait_for_editor` | Block until the user connects. |
| `get_diagram` | Read the current Mermaid source (and whether it renders). |
| `set_diagram` | Replace the diagram — appears live in the editor; reports post-apply validity. |
| `append_to_diagram` | Append text to the end of the diagram without resending the whole source. |
| `validate_diagram` | Syntax-check Mermaid via the editor's engine. |
| `render_diagram` | Render to PNG (an image the agent can see) or SVG. |
| `get_syntax_reference` | Mermaid cheat-sheets by diagram type — no editor needed. |

A typical agent flow: `get_pairing_code` → tell the user → `wait_for_editor` → `get_syntax_reference` →
`set_diagram` → `render_diagram` to check the result → iterate.

### Resource

The current diagram is also exposed as an MCP **resource**, `mermalaid://diagram/current`
(`text/vnd.mermaid`). In clients like Claude Desktop you can @-mention / attach it to pull the live
diagram into context; the server pushes `resources/updated` as it changes, so subscribers stay in
sync.

## Configuration

The server reads CLI flags and environment variables:

| Setting | Flag | Env | Default |
|---|---|---|---|
| Port | `--port <n>` | `MERMALAID_BRIDGE_PORT` | `7337` (falls back through `7340`) |
| Host | `--host <h>` | `MERMALAID_BRIDGE_HOST` | `127.0.0.1` |
| Extra allowed origins | `--origins <csv>` | `MERMALAID_BRIDGE_ORIGINS` | (none) |
| Allow localhost dev origins | `--dev` | `MERMALAID_BRIDGE_DEV` | off |

The editor dials `ws://127.0.0.1:7337` by default. Override with `VITE_AGENT_BRIDGE_PORT` /
`VITE_AGENT_BRIDGE_HOST`, or hide the feature entirely with `VITE_ENABLE_AGENT_BRIDGE=false`.

> Developing Mermalaid itself? The Vite dev/preview origins (`localhost:5173`/`4173`) are **not**
> allowed by default. Start the server with `MERMALAID_BRIDGE_DEV=1` (or `--dev`) to pair from the
> local dev server. The desktop app and `mermalaid.com` need no flag.

## Security

The bridge is designed for a single local user:

- **Loopback only.** The WebSocket binds `127.0.0.1`; remote machines cannot reach it.
- **Pairing code.** A fresh 8-character code is generated each time the server starts and is
  required before any tool can read or write your diagram. It is never persisted.
- **Origin allowlist.** Browsers send a truthful `Origin` on the WebSocket handshake that scripts
  cannot forge, so only pages served from known Mermalaid origins (mermalaid.com and the Tauri
  desktop app by default) can connect — defense-in-depth on top of the code. Generic localhost dev
  ports are excluded unless you opt in with `MERMALAID_BRIDGE_DEV`.

If you restart the agent (and thus the server), the pairing code changes; reconnect with the new
one.

## Browser support

| Surface | Live bridge |
|---|---|
| Mermalaid desktop app (Tauri) | ✅ Recommended |
| Chrome / Edge (web) | ✅ |
| Safari (web, over https) | ❌ Safari blocks `ws://localhost` from an `https` page |

On the local dev server (`http://localhost:5173`) there is no mixed-content restriction, so all
Chromium browsers work. For `https://mermalaid.com`, use Chrome/Edge or the desktop app.

## Troubleshooting

- **"No editor connected"** — open Mermalaid, click **AI Agent**, and enter the current code
  (`get_pairing_code`).
- **"Pairing failed: incorrect code"** — the code rotates on every server restart; ask the agent
  for the current one.
- **Port already in use** — the server scans `7337`→`7340`; if it landed elsewhere, set
  `VITE_AGENT_BRIDGE_PORT` to match, or pass `--port` to pin it.
- **Nothing happens in Safari** — expected; use Chrome/Edge or the desktop app.
- **"Taken over by another tab"** — only one editor can be live at a time; the newest connection
  wins. Click **Reconnect** to take over.

See [`mcp/README.md`](../mcp/README.md) for server-package details.
