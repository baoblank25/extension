"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const axios_1 = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const BACKEND_URL = 'http://localhost:5000';
function activate(context) {
    let disposable = vscode.commands.registerCommand('gitshipnote.generateChangelog', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a Git repository.');
            return;
        }
        const repoPath = workspaceFolders[0].uri.fsPath;
        const commitCount = await vscode.window.showInputBox({
            prompt: 'How many commits to analyze?',
            placeHolder: '50',
            value: '50',
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 1 || num > 100) {
                    return 'Please enter a number between 1 and 100';
                }
                return null;
            }
        });
        if (!commitCount) {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'GitShipNote',
            cancellable: false
        }, async (progress) => {
            progress.report({ message: 'Checking backend connection...' });
            try {
                await axios_1.default.get(`${BACKEND_URL}/health`, { timeout: 3000 });
            }
            catch (error) {
                vscode.window.showErrorMessage('GitShipNote backend is not running. Please start the Flask server: python app.py');
                return;
            }
            progress.report({ message: 'Generating changelog...' });
            try {
                const response = await axios_1.default.post(`${BACKEND_URL}/api/generate-from-repo`, {
                    repo_path: repoPath,
                    from: null,
                    to: 'HEAD',
                    limit: Number(commitCount)
                }, { timeout: 90000 });
                if (response.data.success) {
                    const rawBody = response.data.notes.trim();
                    const actualCount = response.data.commit_count || commitCount;
                    const mdHeader = `# CHANGELOG\n\n*Last ${actualCount} commit${actualCount != 1 ? 's' : ''}*\n\n---\n\n`;
                    const outputText = mdHeader + rawBody + '\n';
                    const tempFileName = `gitshipnote-changelog-${Date.now()}.md`;
                    const tempFile = path.join(os.tmpdir(), tempFileName);
                    fs.writeFileSync(tempFile, outputText, { encoding: 'utf8' });
                    vscode.workspace.openTextDocument(tempFile).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                    vscode.window.showInformationMessage('Changelog markdown file created and opened.');
                }
                else {
                    vscode.window.showErrorMessage(`Error: ${response.data.error}`);
                }
            }
            catch (error) {
                if (error.code === 'ECONNREFUSED') {
                    vscode.window.showErrorMessage('Cannot connect to backend. Make sure Flask is running on port 5000.');
                }
                else if (error.response) {
                    vscode.window.showErrorMessage(`Backend error: ${error.response.data.error || error.message}`);
                }
                else {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                }
            }
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map