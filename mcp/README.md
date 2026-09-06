# @mermalaid/mcp

A local [MCP](https://modelcontextprotocol.io) server that bridges an AI agent to a **live
Mermalaid editor**. The agent can read the current diagram, replace it (changes appear instantly
in the user's editor), validate syntax, and render the diagram to an image it can see.

It speaks MCP to the agent over **stdio**, and hosts a **loopback WebSocket** (`127.0.0.1:7337`)
that the Mermalaid editor connects to. Nothing leaves the machine.

Full guide (install, pairing, tools, security):
[docs/AGENT_INTEGRATION.md](https://github.com/highvoltag3/mermalaid/blob/main/docs/AGENT_INTEGRATION.md).

## Install / register with an agent

```bash
claude mcp add mermalaid -- npx -y @mermalaid/mcp
```

Claude Desktop / Cursor: `"command": "npx", "args": ["-y", "@mermalaid/mcp"]` (see the guide for the full JSON).

The server prints the pairing code and bridge URL to stderr on startup. The agent can also fetch
them with the `get_pairing_code` tool.

## Develop from this repo

```bash
npm install
npm run build      # compiles to dist/
npm run dev        # tsc --watch
npm test
npm run typecheck
```

Or from the repo root: `npm run mcp:build`.

To point an agent at a local build instead of the published package:

```bash
claude mcp add mermalaid -- node /absolute/path/to/mermalaid/mcp/dist/index.js
```

## Tools

`get_connection_status`, `get_pairing_code`, `wait_for_editor`, `get_diagram`, `set_diagram`,
`append_to_diagram`, `validate_diagram`, `render_diagram`, `get_syntax_reference`.

## Resource

`mermalaid://diagram/current` (`text/vnd.mermaid`) — the live diagram, readable and subscribable
(`resources/updated` fires on every change).

## Configuration

| Setting | Flag | Env | Default |
|---|---|---|---|
| Port | `--port <n>` | `MERMALAID_BRIDGE_PORT` | `7337` (scans → `7340`) |
| Host | `--host <h>` | `MERMALAID_BRIDGE_HOST` | `127.0.0.1` |
| Extra origins | `--origins <csv>` | `MERMALAID_BRIDGE_ORIGINS` | (none) |
| Allow localhost dev origins | `--dev` | `MERMALAID_BRIDGE_DEV` | off |

## Security model

Loopback bind + a fresh per-session pairing code (required before any tool touches the diagram) +
an Origin allowlist on the WebSocket handshake. Designed for a single local user. See the guide
for details.

## License

CC-BY-NC-SA-4.0, same as Mermalaid.
