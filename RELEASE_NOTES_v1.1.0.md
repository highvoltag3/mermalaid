# Release v1.1.0

## 🎉 What's New

### ✨ Major Features

#### 🌐 Web Deployment Support
- **Webapp is now live** - A web version has been deployed and is now available at: [https://mermalaid.com](https://mermalaid.com)
- **GitHub Actions Workflow** - Automated deployment pipeline for continuous delivery

#### 🤖 AI-Powered Syntax Fixer
- **Smart Error Correction** - Let AI fix Mermaid syntax errors automatically
- **OpenAI Integration** - Uses ChatGPT to intelligently correct diagram syntax
- **Privacy-First** - API keys stored locally, never sent to any server except OpenAI
- **Settings Panel** - Easy API key management through a dedicated settings interface

#### 🔗 GitHub Integration
- **GitHub Link Button** - Quick access to the GitHub repository from the toolbar
- **Open Source Transparency** - Easy way for users to find and contribute to the project

### 📚 Documentation Improvements
- **Project Structure Guide** - Clear explanation of the codebase organization

### 🔧 Technical Improvements
- **Environment Variables Support** - Configurable build-time environment variables
- **Improved Build Configuration** - Optimized Vite configuration for production
- **Better Error Handling** - Enhanced error messages and validation
- **Code Organization** - Better project structure and documentation

### 🐛 Bug Fixes
- **Monaco Editor Updates** - Fixed issue where editor wouldn't update when code changed externally
- **Code Block Extraction** - Improved handling of markdown-wrapped Mermaid code
- **Copy Code Fix** - Prevented double-wrapping when using Copy Code button

### 📦 Build & Dependencies
- **Vite 5.4.21** - Downgraded for better compatibility and stability
- **Dependency Updates** - Updated and optimized all dependencies
- **Build Optimization** - Improved production build settings

## 📖 Upgrade Guide

### For Users
- Download the latest `.dmg` file from [GitHub Releases](https://github.com/highvoltag3/mermalaid/releases)
- Follow the installation instructions in the README
- No data migration needed - your diagrams will continue to work

### For Developers
- Pull the latest changes from `main` branch
- Run `npm install` to update dependencies
- The build process remains the same: `npm run build` or `npm run tauri:build`

## 🎯 What's Next

Future releases may include:
- Windows and Linux builds
- Additional export formats (PDF, etc.)
- More Mermaid diagram types
- Performance optimizations
- UI/UX improvements

## 🙏 Thank You

Thanks to all contributors and users who helped make this release possible!

---

**Full Changelog**: See [GitHub Commits](https://github.com/highvoltag3/mermalaid/compare/v1.0.0...v1.1.0)
