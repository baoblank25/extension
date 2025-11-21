import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('gitshipnote.generateChangelog', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a Git repository.');
            return;
        }
        const repoPath = workspaceFolders[0].uri.fsPath;

        // Check if API key is configured
        const config = vscode.workspace.getConfiguration('gitshipnote');
        let apiKey = config.get<string>('anthropicApiKey');

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
                const changelog = await generateChangelog(gitLog, apiKey!);

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

            } catch (error: any) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

async function getGitLog(repoPath: string, limit: number): Promise<string> {
    try {
        const cmd = `git -C "${repoPath}" log -${limit} --pretty=format:"%h|%cd|%an|%s" --date=format:"%b %d, %I:%M %p" --name-status`;
        const { stdout, stderr } = await execAsync(cmd);
        
        if (stderr && !stdout) {
            throw new Error(`Git error: ${stderr}`);
        }
        
        return stdout;
    } catch (error: any) {
        throw new Error(`Failed to read git log: ${error.message}`);
    }
}

async function generateChangelog(gitLog: string, apiKey: string): Promise<string> {
    const client = new Anthropic({ apiKey });

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
    } catch (error: any) {
        throw new Error(`AI generation failed: ${error.message}`);
    }
}

export function deactivate() {}
