# GitShipNote VSCODE Extension
AI-powered changelog generator for Git repositories.

GitHub Repository

## Features
- Instantly generate categorized, human-friendly changelogs for any Git repo
- VS Code extension: see changelog in a Markdown file
- Python/Flask backend: processes your Git repo data securely on your machine
- Each changelog entry includes author and commit time

## Set Up & Usage
1. Clone the repository:

```
git clone https://github.com/baoblank25/Git_Ship_Note.git
cd Git_Ship_Note
```
# 2. Set up the Python backend:

- Make sure you have Python 3.9+ installed.

- (Recommended) Create and activate a virtual environment:
```
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```
- Install backend dependencies:
```
pip install -r requirements.txt
```
- Create a .env file in the root folder and add your Anthropic Claude API key:
```
ANTHROPIC_API_KEY=your-claude-api-key-here
```
3. Start the backend Flask server:
```
python app.py
# The backend will run at http://localhost:5000
```
4. Set Up the VS Code Extension:
- Open the Git_Ship_Note/extension folder in VS Code.
- Install dependencies and build the extension:
```
cd extension
npm install
npm run compile
```
- Package the extension:
```
npm install -g vsce
vsce package  # outputs a .vsix file
```
- In VS Code, press Ctrl+Shift+P, then type and select Extensions: Install from VSIX... and choose your generated .vsix file.

5. Use the Extension:
- Open any Git-tracked folder in VS Code.
- Make sure your Flask backend is running.
- Press Ctrl+Shift+P and run: GitShipNote: Generate Changelog
- Choose the number of commits, and a Markdown changelog will open in a new editor tab.

## Example Output
```
CHANGELOG

*Last 36 commits*

---

### FEATURES

- Added Claude logo and updated About component in `frontend/ship-note/components/About.tsx` and `frontend/ship-note/public/images/ClaudeAI.png` - by Caden (Nov 9, 12:46 AM)

- Created new CLI tool in `cli/git_ship_note.py` with file tracking, author info, and timestamps - by Brian Bao Hoang (Nov 8, 6:36 PM)

...etc
```
## Requirements
- Python 3.9+
- Node.js 18+ for extension build
- Anthropic Claude API key (.env file required)
- Git repository to analyze

## Development / Customization
- Update extension, backend, or AI prompt as needed and repackage as above.
- PRs and issues welcome: baoblank25/Git_Ship_Note

## Resources
- Anthropic Claude API
- VS Code Extension Docs
