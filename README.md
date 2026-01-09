# GitShipNote

**AI-powered changelog generator for Git repositories**

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/BrianBaoHoang.gitshipnote)](https://marketplace.visualstudio.com/items?itemName=BrianBaoHoang.gitshipnote)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/BrianBaoHoang.gitshipnote)](https://marketplace.visualstudio.com/items?itemName=BrianBaoHoang.gitshipnote)

Turn your messy git history into clean, readable changelogs. No more digging through commits trying to figure out what changed.

## What it does

- **Generates changelogs from your commits** - Just tell it how many commits to look at and it does the rest
- **Sorts everything automatically** - Groups commits into Features, Fixes, Improvements, and Documentation
- **Handles big repos** - Works with up to 1000 commits at a time, with smart batching and caching
- **Keeps your data private** - Your API key stays on your machine, nothing gets uploaded anywhere
- **Outputs clean Markdown** - Ready to copy into your release notes or documentation

## What's new in v1.1

- Increased commit limit from 100 to 1000
- Added commit caching so re-running is faster
- Smart pre-categorization before sending to AI (speeds things up)
- Better error messages when something goes wrong
- Added a "Clear Cache" command
- Cancellable operations with progress updates

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. Search for "GitShipNote"
4. Click Install

### From VSIX File

```bash
code --install-extension gitshipnote-1.0.0.vsix
```

## How to use it

1. Open any Git repository in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type `GitShipNote: Generate Changelog`
4. Enter your Anthropic API key if this is your first time
   - Grab one from https://console.anthropic.com/
   - You can save it so you don't have to enter it again
5. Pick how many commits to analyze (up to 1000)
6. Wait a few seconds and your changelog opens in a new tab

## Getting an API key

GitShipNote uses Claude to understand your commits and write the changelog. You'll need an Anthropic API key:

1. Head to https://console.anthropic.com/
2. Create an account (they have a free tier)
3. Generate an API key
4. Paste it when the extension asks, or add it in Settings > GitShipNote

Your key is stored locally in VS Code settings. It never leaves your machine.

## Example output

```markdown
# CHANGELOG

*5 features | 3 fixes | 2 improvements | 1 docs*

---

## Features
- Added user authentication with OAuth support
- New dashboard with real-time analytics
- Dark mode toggle in settings

## Fixes
- Fixed memory leak in background service
- Resolved API timeouts during peak hours
- Date formatting now works correctly in exports

## Improvements
- Database queries are faster now
- Better error messages for debugging
- Updated UI for accessibility

## Documentation
- Added API docs with examples
```

## Commands

- `GitShipNote: Generate Changelog` - Create a changelog from your commits
- `GitShipNote: Clear Cache` - Clear the cached commit data (useful if you've made new commits)

## Settings

- `gitshipnote.anthropicApiKey` - Your Anthropic API key
- `gitshipnote.maxCommits` - Maximum commits allowed (default: 1000)
- `gitshipnote.cacheTTL` - How long to cache commits in seconds (default: 300)

## Building from source

```bash
git clone https://github.com/baoblank25/Git_Ship_Note.git
cd Git_Ship_Note/extension
npm install
npm run compile
```

To package it:

```bash
npm install -g @vscode/vsce
vsce package
```

## Contributing

Found a bug? Have an idea? PRs and issues are welcome at [baoblank25/Git_Ship_Note](https://github.com/baoblank25/Git_Ship_Note)

## License

MIT - see [LICENSE](LICENSE)

## Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=BrianBaoHoang.gitshipnote)
- [GitHub](https://github.com/baoblank25/Git_Ship_Note)
- [Anthropic API](https://www.anthropic.com/api)
- [Report a bug](https://github.com/baoblank25/Git_Ship_Note/issues)
