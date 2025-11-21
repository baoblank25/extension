"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function activate(context) {
    let disposable = vscode.commands.registerCommand('gitshipnote.generateChangelog', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a Git repository.');
            return;
        }
        const repoPath = workspaceFolders[0].uri.fsPath;
        // Check if API key is configured
        const config = vscode.workspace.getConfiguration('gitshipnote');
        let apiKey = config.get('anthropicApiKey');
        if (!apiKey) {
            apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Anthropic API Key (get it from console.anthropic.com)',
                password: true,
                placeHolder: 'sk-ant-api03-...',
                ignoreFocusOut: true
            });
            if (!apiKey) {
                vscode.window.showErrorMessage('API key is required to generate changelog.');
                return;
            }
            // Ask to save API key
            const shouldSave = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Save API key for future use?'
            });
            if (shouldSave === 'Yes') {
                await config.update('anthropicApiKey', apiKey, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('API key saved to settings.');
            }
        }
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
            try {
                // Step 1: Get git log
                progress.report({ message: 'Reading git commits...' });
                const gitLog = await getGitLog(repoPath, Number(commitCount));
                if (!gitLog.trim()) {
                    vscode.window.showErrorMessage('No commits found in this repository.');
                    return;
                }
                // Step 2: Generate changelog with Claude
                progress.report({ message: 'Generating changelog with AI...' });
                const changelog = await generateChangelog(gitLog, apiKey);
                // Step 3: Create and open markdown file
                progress.report({ message: 'Creating changelog file...' });
                const mdHeader = `# CHANGELOG\n\n*Last ${commitCount} commit${commitCount != '1' ? 's' : ''}*\n\n---\n\n`;
                const outputText = mdHeader + changelog + '\n';
                const tempFileName = `gitshipnote-changelog-${Date.now()}.md`;
                const tempFile = path.join(os.tmpdir(), tempFileName);
                fs.writeFileSync(tempFile, outputText, { encoding: 'utf8' });
                const doc = await vscode.workspace.openTextDocument(tempFile);
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage('✅ Changelog generated successfully!');
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        });
    });
    context.subscriptions.push(disposable);
}
async function getGitLog(repoPath, limit) {
    try {
        const cmd = `git -C "${repoPath}" log -${limit} --pretty=format:"%h|%cd|%an|%s" --date=format:"%b %d, %I:%M %p" --name-status`;
        const { stdout, stderr } = await execAsync(cmd);
        if (stderr && !stdout) {
            throw new Error(`Git error: ${stderr}`);
        }
        return stdout;
    }
    catch (error) {
        throw new Error(`Failed to read git log: ${error.message}`);
    }
}
async function generateChangelog(gitLog, apiKey) {
    const client = new sdk_1.default({ apiKey });
    const systemPrompt = `You are a professional technical writer specializing in creating clean, user-friendly changelogs.

Your task is to:
1. Read the provided git commit history
2. Categorize commits into: Features, Fixes, Improvements, Documentation, and Other
3. Ignore: merge commits, version bumps, trivial updates, and developer-only changes
4. Write in clear, non-technical language that end users can understand
5. Format the output in clean Markdown

Format your response as:
## Features
- Brief description of new feature

## Fixes
- Brief description of bug fix

## Improvements
- Brief description of improvement

## Documentation
- Brief description of documentation changes

Only include categories that have actual content. Be concise and user-focused.`;
    try {
        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{
                    role: 'user',
                    content: `Here is the git log to convert into a changelog:\n\n${gitLog}`
                }]
        });
        return message.content[0].type === 'text' ? message.content[0].text : '';
    }
    catch (error) {
        throw new Error(`AI generation failed: ${error.message}`);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map