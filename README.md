# Mermalaid

A native macOS Mermaid diagram editor built with **Tauri**, React, and TypeScript.

## Features

- **Monaco Editor** with syntax highlighting
- **Live Preview** with debounced updates (500ms)
- **Auto-save** to localStorage
- **File Management**: Open, Save, Export (SVG, PNG)
- **Theme Support**: Light/Dark mode and multiple Mermaid themes
- **Syntax Validation**: Real-time error detection
- **Copy to Clipboard**: Export code blocks for Markdown
- **Native macOS App**: Lightweight desktop app using system webview

## Why Tauri?

Tauri is a modern alternative to Electron that provides:
- 🚀 **Much smaller app size** (~10MB vs ~100MB+ for Electron)
- ⚡ **Better performance** using system webview instead of bundled Chromium
- 🔒 **Enhanced security** with Rust backend
- 💰 **Lower memory usage**
- 🎯 **Better native integration**

## Prerequisites

- Node.js 18+
- Rust (Tauri will install this automatically if not present)
- macOS (for building macOS apps)

## Development

### Running in Development

```bash
# Install dependencies
npm install

# Run Tauri in development mode
npm run tauri:dev
```

This will:
1. Start the Vite dev server on `http://localhost:5173`
2. Launch Tauri with the development server
3. Hot reload your React app

### Building for Production

```bash
# Build the app for macOS
npm run tauri:build
```

The built app will be in `src-tauri/target/release/bundle/`:
- `.app` file for macOS
- `.dmg` installer

### Other Commands

```bash
# Just run web version (dev server)
npm run dev

# Build web assets only
npm run build

# Tauri CLI commands
npm run tauri [command]
```

## Project Structure

```
mermalaid/
├── src/                 # React app
│   ├── components/      # React components
│   ├── contexts/         # React contexts
│   └── main.tsx         # App entry point
├── src-tauri/           # Tauri backend (Rust)
│   ├── src/             # Rust source code
│   ├── Cargo.toml       # Rust dependencies
│   └── tauri.conf.json  # Tauri configuration
└── dist/                # Built web assets
```

## Keyboard Shortcuts

- ⌘N: New diagram
- ⌘O: Open file
- ⌘S: Save file

## Example Diagrams

Try these in the editor:

```
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

```
sequenceDiagram
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: Great!
```

## Troubleshooting

**Tauri won't start:**
- Make sure Rust is installed: `rustc --version`
- Tauri will prompt to install Rust if missing
- Check that port 5173 is available for dev server

**Build fails:**
- Ensure you've run `npm run build` first
- Check that `dist/` directory exists with built files
- On macOS, you may need to allow the app in Security & Privacy settings

**App size concerns:**
- Tauri apps are much smaller than Electron (~10MB vs ~100MB+)
- First build may take longer as Rust compiles dependencies

## License

MIT
