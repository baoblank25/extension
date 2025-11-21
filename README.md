# GitShipNote

**AI-powered changelog generator for Git repositories**

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/BrianBaoHoang.gitshipnote)](https://marketplace.visualstudio.com/items?itemName=BrianBaoHoang.gitshipnote)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/BrianBaoHoang.gitshipnote)](https://marketplace.visualstudio.com/items?itemName=BrianBaoHoang.gitshipnote)

Transform your messy git logs into beautiful, human-readable changelogs with AI.

## ✨ Features

- 🚀 **One-click changelog generation** - No setup, no backend servers
- 🤖 **AI-powered categorization** - Automatically sorts commits into Features, Fixes, Improvements, and Documentation
- 📝 **Clean Markdown output** - Professional changelogs ready to share
- 🔒 **Privacy-first** - Your API key stays on your machine, never uploaded
- ⚡ **Fast & lightweight** - Runs directly in VS Code

## 📦 Installation

### From VS Code Marketplace (Recommended)

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. Search for **"GitShipNote"**
4. Click **Install**

### From VSIX File

```bash
code --install-extension gitshipnote-1.0.0.vsix
```

## 🚀 Usage

1. **Open a Git repository** in VS Code
2. **Press** `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. **Type** `GitShipNote: Generate Changelog`
4. **Enter your Anthropic API key** (first time only)
   - Get your free API key at: https://console.anthropic.com/
   - The extension will securely save it in VS Code settings
5. **Choose how many commits** to analyze (1-100)
6. **View your changelog!** - Opens in a new Markdown file

## 🔑 API Key Setup

GitShipNote uses Claude AI to generate intelligent changelogs. You'll need your own Anthropic API key:

1. Go to https://console.anthropic.com/
2. Sign up for a free account
3. Create an API key
4. Paste it when prompted in VS Code (or add it manually in Settings → GitShipNote)

**Your API key is stored locally and never shared.**

## 📄 Example Output

```markdown
# CHANGELOG

*Last 50 commits*

---

## Features
- Added user authentication system with OAuth support
- Implemented dark mode toggle in settings panel
- Created new dashboard with real-time analytics

## Fixes
- Fixed memory leak in background service
- Resolved API timeout issues during peak hours
- Corrected date formatting in export feature

## Improvements
- Optimized database queries for faster load times
- Enhanced error messages for better debugging
- Updated UI components for better accessibility

## Documentation
- Added API documentation with examples
- Updated README with installation instructions
```

## 🛠️ Development

### Building from Source

```bash
git clone https://github.com/baoblank25/Git_Ship_Note.git
cd Git_Ship_Note/extension
npm install
npm run compile
```

### Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

## 🤝 Contributing

PRs and issues welcome! Visit: [baoblank25/Git_Ship_Note](https://github.com/baoblank25/Git_Ship_Note)

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

## 🔗 Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=BrianBaoHoang.gitshipnote)
- [GitHub Repository](https://github.com/baoblank25/Git_Ship_Note)
- [Anthropic Claude API](https://www.anthropic.com/api)
- [Report an Issue](https://github.com/baoblank25/Git_Ship_Note/issues)
