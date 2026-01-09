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
// Config stuff - tweak these if you need to
const settings = {
    maxCommits: 1000,
    batchSize: 50,
    aiChunkSize: 100,
    parallelBatches: 4,
    cacheTTL: 5 * 60 * 1000, // 5 mins
};
// Simple cache to avoid re-parsing the same commits over and over
const cache = new Map();
// Patterns to detect commit types from the message
// Supports conventional commits + common phrases people actually use
const messagePatterns = [
    // Conventional commit style
    [/^feat(\(.+\))?[!:]/i, 'feature'],
    [/^fix(\(.+\))?[!:]/i, 'fix'],
    [/^docs(\(.+\))?[!:]/i, 'documentation'],
    [/^style(\(.+\))?[!:]/i, 'improvement'],
    [/^refactor(\(.+\))?[!:]/i, 'refactor'],
    [/^perf(\(.+\))?[!:]/i, 'improvement'],
    [/^test(\(.+\))?[!:]/i, 'test'],
    [/^build(\(.+\))?[!:]/i, 'chore'],
    [/^ci(\(.+\))?[!:]/i, 'chore'],
    [/^chore(\(.+\))?[!:]/i, 'chore'],
    // How people actually write commits lol
    [/^add(ed|ing|s)?\s/i, 'feature'],
    [/^implement/i, 'feature'],
    [/^creat(e|ed|ing)/i, 'feature'],
    [/^introduc/i, 'feature'],
    [/^new\s/i, 'feature'],
    [/^fix(ed|ing|es)?\s/i, 'fix'],
    [/^bug/i, 'fix'],
    [/^patch/i, 'fix'],
    [/^resolv/i, 'fix'],
    [/^hotfix/i, 'fix'],
    [/^improv/i, 'improvement'],
    [/^updat/i, 'improvement'],
    [/^enhanc/i, 'improvement'],
    [/^optimi/i, 'improvement'],
    [/^better/i, 'improvement'],
    [/^tweak/i, 'improvement'],
    [/^doc(s|umentation)?[:\s]/i, 'documentation'],
    [/^readme/i, 'documentation'],
    [/^comment/i, 'documentation'],
    [/^refactor/i, 'refactor'],
    [/^restructur/i, 'refactor'],
    [/^clean/i, 'refactor'],
    [/^reorgani/i, 'refactor'],
    [/^test/i, 'test'],
    [/^spec/i, 'test'],
    [/^merge\s/i, 'chore'],
    [/^bump/i, 'chore'],
    [/^version/i, 'chore'],
    [/^release/i, 'chore'],
    [/^wip/i, 'chore'],
];
// Sometimes the files tell us more than the commit message
const fileHints = [
    [/\.(md|txt|rst)$/i, 'documentation'],
    [/readme/i, 'documentation'],
    [/changelog/i, 'documentation'],
    [/\.(test|spec)\.(js|ts|jsx|tsx|py)$/i, 'test'],
    [/__tests__\//i, 'test'],
    [/\.github\//i, 'chore'],
    [/dockerfile/i, 'chore'],
    [/docker-compose/i, 'chore'],
    [/package(-lock)?\.json$/i, 'chore'],
    [/yarn\.lock$/i, 'chore'],
    [/\.env/i, 'chore'],
];
// Takes the raw git log output and turns it into something usable
function parseCommits(raw) {
    const commits = [];
    // Split by commit hash at start of line
    const blocks = raw.split(/(?=^[a-f0-9]{7,}\|)/m).filter(b => b.trim());
    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (!lines.length)
            continue;
        // First line has the commit info: hash|date|author|message
        const match = lines[0].match(/^([a-f0-9]+)\|(.+?)\|(.+?)\|(.+)$/);
        if (!match)
            continue;
        const [, hash, date, author, message] = match;
        // Rest of the lines are file changes
        const files = [];
        for (let i = 1; i < lines.length; i++) {
            const fileMatch = lines[i].match(/^([AMDRC])\t(.+)$/);
            if (fileMatch) {
                files.push({ status: fileMatch[1], path: fileMatch[2] });
            }
        }
        // Figure out what type of commit this is
        const type = guessCommitType(message, files);
        const scope = message.match(/^\w+\(([^)]+)\)/)?.[1];
        const breaking = /^.+!:/.test(message) || /BREAKING/i.test(message);
        const merge = /^merge\s/i.test(message);
        commits.push({ hash, date, author, message, files, type, scope, breaking, merge });
    }
    return commits;
}
// Best effort attempt to figure out what kind of change this commit represents
function guessCommitType(message, files) {
    // Check message first - usually the best indicator
    for (const [pattern, type] of messagePatterns) {
        if (pattern.test(message))
            return type;
    }
    // If that didn't work, look at what files changed
    if (files.length) {
        const votes = new Map();
        for (const file of files) {
            for (const [pattern, type] of fileHints) {
                if (pattern.test(file.path)) {
                    votes.set(type, (votes.get(type) || 0) + 1);
                }
            }
        }
        // Return whatever got the most votes
        let best = 'other';
        let bestCount = 0;
        for (const [type, count] of votes) {
            if (count > bestCount) {
                best = type;
                bestCount = count;
            }
        }
        if (bestCount > 0)
            return best;
    }
    return 'other';
}
// Group commits by category so we can process them better
function sortIntoBuckets(commits) {
    const sorted = {
        features: [],
        fixes: [],
        improvements: [],
        docs: [],
        other: []
    };
    for (const commit of commits) {
        // Skip merge commits - they're just noise
        if (commit.merge)
            continue;
        switch (commit.type) {
            case 'feature':
                sorted.features.push(commit);
                break;
            case 'fix':
                sorted.fixes.push(commit);
                break;
            case 'improvement':
            case 'refactor':
                sorted.improvements.push(commit);
                break;
            case 'documentation':
                sorted.docs.push(commit);
                break;
            case 'test':
            case 'chore':
                // Only keep chores/tests if they seem significant
                if (commit.breaking || commit.files.length > 5) {
                    sorted.other.push(commit);
                }
                break;
            default:
                sorted.other.push(commit);
        }
    }
    return sorted;
}
// Process commits in batches - helps with big repos
async function processBatched(raw) {
    const blocks = raw.split(/(?=^[a-f0-9]{7,}\|)/m).filter(Boolean);
    const batches = [];
    for (let i = 0; i < blocks.length; i += settings.batchSize) {
        batches.push(blocks.slice(i, i + settings.batchSize));
    }
    const results = [];
    // Process a few batches at a time
    for (let i = 0; i < batches.length; i += settings.parallelBatches) {
        const batch = batches.slice(i, i + settings.parallelBatches);
        const parsed = await Promise.all(batch.map(b => Promise.resolve(parseCommits(b.join('\n')))));
        results.push(...parsed);
    }
    return results.flat();
}
// Format commits nicely for Claude to read
function formatForAI(commits) {
    return commits.map(c => {
        const fileList = c.files.slice(0, 5).map(f => `${f.status}:${f.path}`).join(', ');
        const extra = c.files.length > 5 ? ` (+${c.files.length - 5} more)` : '';
        return `[${c.hash}] ${c.message} | ${c.author} | ${fileList}${extra}`;
    }).join('\n');
}
// Split commits into manageable chunks for the AI
function prepareChunks(sorted) {
    const chunks = [];
    const addChunk = (commits, name) => {
        for (let i = 0; i < commits.length; i += settings.aiChunkSize) {
            const slice = commits.slice(i, i + settings.aiChunkSize);
            if (slice.length) {
                chunks.push({ name, content: formatForAI(slice) });
            }
        }
    };
    addChunk(sorted.features, 'Features');
    addChunk(sorted.fixes, 'Fixes');
    addChunk(sorted.improvements, 'Improvements');
    addChunk(sorted.docs, 'Documentation');
    addChunk(sorted.other, 'Other');
    return chunks;
}
// ---- Main extension stuff ----
function activate(context) {
    const generateCmd = vscode.commands.registerCommand('gitshipnote.generateChangelog', async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            vscode.window.showErrorMessage('Open a folder with a git repo first!');
            return;
        }
        const repoPath = folders[0].uri.fsPath;
        const config = vscode.workspace.getConfiguration('gitshipnote');
        let apiKey = config.get('anthropicApiKey');
        // Get API key if we don't have one saved
        if (!apiKey) {
            apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Anthropic API Key',
                password: true,
                placeHolder: 'sk-ant-api03-...',
                ignoreFocusOut: true
            });
            if (!apiKey) {
                vscode.window.showErrorMessage('Need an API key to generate the changelog');
                return;
            }
            const save = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Save API key for next time?'
            });
            if (save === 'Yes') {
                await config.update('anthropicApiKey', apiKey, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('API key saved!');
            }
        }
        // Ask how many commits to look at
        const countInput = await vscode.window.showInputBox({
            prompt: 'How many commits?',
            placeHolder: '100',
            value: '100',
            validateInput: (val) => {
                const n = parseInt(val);
                if (isNaN(n) || n < 1 || n > settings.maxCommits) {
                    return `Enter a number from 1 to ${settings.maxCommits}`;
                }
                return null;
            }
        });
        if (!countInput)
            return;
        const count = parseInt(countInput);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'GitShipNote',
            cancellable: true
        }, async (progress, token) => {
            try {
                const startTime = Date.now();
                const cacheKey = `${repoPath}:${count}`;
                let commits;
                // Check if we already parsed these commits recently
                const cached = cache.get(cacheKey);
                if (cached && (Date.now() - cached.time) < settings.cacheTTL) {
                    progress.report({ message: 'Using cached data...', increment: 10 });
                    commits = cached.data;
                }
                else {
                    progress.report({ message: `Fetching ${count} commits...`, increment: 5 });
                    const raw = await fetchGitLog(repoPath, count);
                    if (!raw.trim()) {
                        vscode.window.showErrorMessage('No commits found');
                        return;
                    }
                    if (token.isCancellationRequested)
                        return;
                    progress.report({ message: 'Parsing commits...', increment: 15 });
                    commits = await processBatched(raw);
                    // Save for next time
                    cache.set(cacheKey, { data: commits, time: Date.now() });
                }
                if (token.isCancellationRequested)
                    return;
                progress.report({ message: 'Sorting commits...', increment: 10 });
                const sorted = sortIntoBuckets(commits);
                const total = sorted.features.length + sorted.fixes.length +
                    sorted.improvements.length + sorted.docs.length + sorted.other.length;
                const chunks = prepareChunks(sorted);
                progress.report({ message: `Writing changelog (${total} commits)...`, increment: 20 });
                let changelog;
                if (count > 200) {
                    // Big repo - need to process in chunks
                    changelog = await generateInChunks(chunks, apiKey, progress, token);
                }
                else {
                    // Small enough to do all at once
                    const formatted = formatForAI(commits.filter(c => !c.merge));
                    changelog = await generateWithAI(formatted, sorted, apiKey);
                }
                if (token.isCancellationRequested)
                    return;
                progress.report({ message: 'Almost done...', increment: 40 });
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                // Build the final markdown doc
                const header = `# CHANGELOG\n\n` +
                    `*${sorted.features.length} features | ${sorted.fixes.length} fixes | ` +
                    `${sorted.improvements.length} improvements | ${sorted.docs.length} docs*\n\n---\n\n`;
                const output = header + changelog + '\n';
                // Write to temp file and show it
                const tempFile = path.join(os.tmpdir(), `changelog-${Date.now()}.md`);
                fs.writeFileSync(tempFile, output, 'utf8');
                const doc = await vscode.workspace.openTextDocument(tempFile);
                await vscode.window.showTextDocument(doc);
                vscode.window.showInformationMessage(`Done! ${total} commits in ${elapsed}s`);
            }
            catch (err) {
                if (!token.isCancellationRequested) {
                    vscode.window.showErrorMessage(`Oops: ${err.message}`);
                }
            }
        });
    });
    const clearCacheCmd = vscode.commands.registerCommand('gitshipnote.clearCache', () => {
        cache.clear();
        vscode.window.showInformationMessage('Cache cleared');
    });
    context.subscriptions.push(generateCmd, clearCacheCmd);
}
async function fetchGitLog(repoPath, limit) {
    const cmd = `git -C "${repoPath}" log -${limit} --pretty=format:"%h|%cd|%an|%s" --date=format:"%b %d, %I:%M %p" --name-status`;
    // Need a bigger buffer for repos with lots of commits
    const bufferSize = Math.max(10 * 1024 * 1024, limit * 5000);
    try {
        const { stdout, stderr } = await execAsync(cmd, { maxBuffer: bufferSize });
        if (stderr && !stdout)
            throw new Error(stderr);
        return stdout;
    }
    catch (err) {
        // Handle common git errors with friendlier messages
        const msg = err.message || '';
        if (msg.includes('does not have any commits yet')) {
            throw new Error("This branch doesn't have any commits yet. Make some commits first!");
        }
        if (msg.includes('not a git repository')) {
            throw new Error("This folder isn't a git repository. Run 'git init' first.");
        }
        if (msg.includes('unknown revision')) {
            throw new Error("Couldn't find that branch. Make sure you're on a valid branch.");
        }
        throw new Error(`Git error: ${msg}`);
    }
}
async function generateWithAI(commits, sorted, apiKey) {
    const client = new sdk_1.default({ apiKey });
    const prompt = `You're writing a changelog for users. Here's what we found in the commits:
- ${sorted.features.length} new features
- ${sorted.fixes.length} bug fixes  
- ${sorted.improvements.length} improvements
- ${sorted.docs.length} doc updates
- ${sorted.other.length} other changes

Turn these commits into a nice, readable changelog. Group them by category, 
write in plain English (not dev speak), and combine similar stuff together.
Skip merge commits and boring internal stuff.

Format like this:
## Features
- What's new

## Fixes
- What got fixed

Only include sections that actually have content.`;
    try {
        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            system: prompt,
            messages: [{
                    role: 'user',
                    content: `Here are the commits:\n\n${commits}`
                }]
        });
        return response.content[0].type === 'text' ? response.content[0].text : '';
    }
    catch (err) {
        throw new Error(`AI request failed: ${err.message}`);
    }
}
async function generateInChunks(chunks, apiKey, progress, token) {
    const client = new sdk_1.default({ apiKey });
    const results = new Map();
    const prompt = `Turn these commits into brief changelog bullet points. 
Just output the bullets - no headers needed. Keep it short and user-friendly.
Combine similar changes when it makes sense.`;
    for (let i = 0; i < chunks.length; i++) {
        if (token.isCancellationRequested)
            break;
        const chunk = chunks[i];
        progress.report({ message: `${chunk.name} (${i + 1}/${chunks.length})...` });
        try {
            const response = await client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                system: prompt,
                messages: [{
                        role: 'user',
                        content: `Category: ${chunk.name}\n\n${chunk.content}`
                    }]
            });
            const text = response.content[0].type === 'text' ? response.content[0].text : '';
            if (!results.has(chunk.name)) {
                results.set(chunk.name, []);
            }
            results.get(chunk.name).push(text);
        }
        catch (err) {
            console.error(`Chunk failed: ${err.message}`);
        }
    }
    // Stitch it all together
    const sections = [];
    for (const name of ['Features', 'Fixes', 'Improvements', 'Documentation', 'Other']) {
        const items = results.get(name);
        if (items?.length) {
            sections.push(`## ${name}\n${items.join('\n')}`);
        }
    }
    return sections.join('\n\n');
}
function deactivate() {
    cache.clear();
}
//# sourceMappingURL=extension.js.map