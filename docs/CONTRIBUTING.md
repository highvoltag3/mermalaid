# Contributing to Mermalaid

Thank you for your interest in contributing to Mermalaid! This document provides guidelines and best practices for contributing to the project.

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** (Tauri will prompt to install if missing)
- **macOS** (for building macOS apps)
- Basic familiarity with React, TypeScript, and Rust

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mermalaid.git
   cd mermalaid
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run tauri:dev
   ```
   This starts the Vite dev server and launches the Tauri app with hot reload.

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-dark-mode-toggle`
- `fix/export-png-resolution`
- `refactor/editor-component`
- `docs/update-installation-guide`

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards below

3. **Test your changes:**
   ```bash
   # Test the web version
   npm run dev
   
   # Test the Tauri app
   npm run tauri:dev
   
   # Build to verify production build works
   npm run tauri:build
   ```

4. **Commit your changes** (see commit message guidelines below)

5. **Push and create a Pull Request**

## Coding Standards

### TypeScript/React

- **Use TypeScript** - Avoid `any` types; use proper types
- **Functional components** - Prefer function components over classes
- **Hooks** - Use React hooks for state and effects
- **Naming:**
  - Components: PascalCase (`Toolbar.tsx`)
  - Files: Match component name
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE

- **Component structure:**
  ```typescript
  // Imports
  import { useState } from 'react'
  
  // Types/interfaces
  interface Props {
    code: string
    onUpdate: (code: string) => void
  }
  
  // Component
  export default function Component({ code, onUpdate }: Props) {
    // State
    const [value, setValue] = useState('')
    
    // Effects
    useEffect(() => { /* ... */ }, [])
    
    // Handlers
    const handleChange = () => { /* ... */ }
    
    // Render
    return <div>...</div>
  }
  ```

### Rust

- **Follow Rust conventions** - Use `rustfmt` and `clippy`
- **Error handling** - Use `Result` types appropriately
- **Naming:**
  - Functions/variables: snake_case
  - Types: PascalCase
  - Constants: UPPER_SNAKE_CASE

### Code Style

- **Keep functions small** - Single responsibility principle
- **Add comments** for complex logic, not obvious code
- **Remove commented-out code** - Use git history instead
- **Consistent formatting** - The project uses Prettier for TypeScript/TSX

## Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(editor): add syntax validation for Mermaid diagrams

fix(export): resolve PNG export quality issue

docs(readme): update installation instructions

refactor(toolbar): simplify button component logic
```

Keep the subject line under 50 characters and use imperative mood ("add" not "added").

## Pull Request Process

1. **Update documentation** if you've changed functionality
2. **Add/update tests** if applicable
3. **Ensure builds pass** - Check that `npm run tauri:build` succeeds
4. **Write a clear PR description:**
   - What changes were made
   - Why they were made
   - How to test the changes
   - Screenshots for UI changes

5. **Keep PRs focused** - One feature or fix per PR
6. **Respond to feedback** - Be open to suggestions and changes

## Testing

### Manual Testing Checklist

Before submitting a PR, verify:

- [ ] App builds successfully (`npm run tauri:build`)
- [ ] Development mode works (`npm run tauri:dev`)
- [ ] Web version works (`npm run dev`)
- [ ] Changes work on macOS
- [ ] No console errors or warnings
- [ ] UI changes are responsive
- [ ] Keyboard shortcuts still work
- [ ] File operations (open/save/export) work

### Testing Specific Features

**Editor:**
- Code input works
- Syntax highlighting is correct
- Auto-save triggers properly

**Preview:**
- Diagrams render correctly
- Theme changes apply
- Error messages display for invalid syntax

**Export:**
- SVG export generates valid files
- PNG export creates images
- File naming is correct

## Areas for Contribution

We welcome contributions in these areas:

### High Priority

- **Code signing/notarization** setup for macOS distribution
- **Windows/Linux builds** (infrastructure)
- **Performance improvements** (rendering, bundle size)
- **Accessibility** improvements

### Features

- Additional Mermaid diagram types support
- Export formats (PDF, etc.)
- Theme customization options
- Keyboard shortcuts configuration
- File templates/examples

### Bug Fixes

- Report bugs via GitHub Issues
- Include steps to reproduce
- Describe expected vs actual behavior

### Documentation

- Code comments for complex logic
- README improvements
- Usage examples
- Troubleshooting guides

## Project Structure

```
mermalaid/
├── src/                    # React frontend
│   ├── components/         # React components
│   │   ├── Editor.tsx     # Monaco Editor wrapper
│   │   ├── Preview.tsx    # Mermaid diagram renderer
│   │   └── Toolbar.tsx    # Top toolbar with actions
│   ├── contexts/          # React contexts
│   │   └── ThemeContext.tsx
│   └── main.tsx           # App entry point
├── src-tauri/             # Tauri backend (Rust)
│   ├── src/              # Rust source code
│   ├── icons/            # App icons
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── dist/                  # Built web assets (generated)
└── .github/
    └── workflows/        # CI/CD workflows
```

## Best Practices

### General

- **Keep it simple** - Avoid over-engineering
- **Follow existing patterns** - Match the codebase style
- **Ask questions** - Open an issue if unsure
- **Be patient** - Review takes time

### Performance

- Avoid unnecessary re-renders
- Use React.memo for expensive components
- Lazy load heavy dependencies if possible
- Keep bundle size in mind

### Security

- Don't commit secrets or API keys
- Validate user inputs
- Sanitize file operations

### Accessibility

- Use semantic HTML
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers when possible

## Questions?

- Open a GitHub Issue for bugs or feature requests
- Check existing issues before creating new ones
- Be respectful and constructive in discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (CC BY-NC-SA 4.0).

Thank you for contributing to Mermalaid! 🎨

