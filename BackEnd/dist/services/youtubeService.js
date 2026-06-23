"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveYouTubeAudioUrl = resolveYouTubeAudioUrl;
exports.resolveYouTubeTranscriptionUrl = resolveYouTubeTranscriptionUrl;
exports.downloadYouTubeAudio = downloadYouTubeAudio;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const youtubei_js_1 = require("youtubei.js");
const youtubeUtils_1 = require("./youtubeUtils");
const storage_1 = require("../config/storage");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const YT_DLP_ARGS = ['--js-runtimes', 'node', '--remote-components', 'ejs:github'];
function discoverYtDlpRunners() {
    const runners = [];
    const seen = new Set();
    const addRunner = (command, prefix = []) => {
        const key = `${command}|${prefix.join(' ')}`;
        if (seen.has(key))
            return;
        seen.add(key);
        runners.push({ command, prefix });
    };
    if (process.env.YT_DLP_PATH) {
        addRunner(process.env.YT_DLP_PATH);
    }
    addRunner('yt-dlp');
    addRunner('python', ['-m', 'yt_dlp']);
    addRunner('python3', ['-m', 'yt_dlp']);
    try {
        const pythonPath = (0, child_process_1.execSync)('where python', { encoding: 'utf8', windowsHide: true })
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find(Boolean);
        if (pythonPath) {
            const scriptsYtDlp = path_1.default.join(path_1.default.dirname(pythonPath), 'Scripts', 'yt-dlp.exe');
            if ((0, fs_1.existsSync)(scriptsYtDlp)) {
                addRunner(scriptsYtDlp);
            }
        }
    }
    catch {
        // ignore lookup failures
    }
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
        const pythonRoot = path_1.default.join(localAppData, 'Python');
        if ((0, fs_1.existsSync)(pythonRoot)) {
            for (const entry of (0, fs_1.readdirSync)(pythonRoot, { withFileTypes: true })) {
                if (!entry.isDirectory())
                    continue;
                const candidate = path_1.default.join(pythonRoot, entry.name, 'Scripts', 'yt-dlp.exe');
                if ((0, fs_1.existsSync)(candidate)) {
                    addRunner(candidate);
                }
            }
        }
    }
    return runners;
}
async function resolveViaYtDlp(videoId) {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    for (const runner of discoverYtDlpRunners()) {
        try {
            const { stdout } = await execFileAsync(runner.command, [
                ...runner.prefix,
                '-f',
                'bestaudio/best',
                '-g',
                ...YT_DLP_ARGS,
                watchUrl,
            ], { timeout: 90_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
            const audioUrl = stdout
                .split(/\r?\n/)
                .map((line) => line.trim())
                .find((line) => line.startsWith('http'));
            if (audioUrl)
                return audioUrl;
        }
        catch {
            // try next runner
        }
    }
    return null;
}
async function resolveViaInnertube(videoId) {
    const yt = await youtubei_js_1.Innertube.create({ retrieve_player: true });
    const info = await yt.getInfo(videoId);
    const format = info.chooseFormat({ type: 'audio', quality: 'best' });
    if (!format) {
        throw new Error('No audio stream found for this YouTube video.');
    }
    if (format.url) {
        return format.url;
    }
    const player = yt.session.player;
    if (!player) {
        throw new Error('YouTube player data unavailable.');
    }
    if (format.decipher) {
        const deciphered = await format.decipher(player);
        if (deciphered)
            return deciphered;
    }
    throw new Error('Could not resolve YouTube audio stream.');
}
async function resolveYouTubeAudioUrl(videoId) {
    const ytdlpUrl = await resolveViaYtDlp(videoId);
    if (ytdlpUrl)
        return ytdlpUrl;
    try {
        return await resolveViaInnertube(videoId);
    }
    catch (innertubeError) {
        const message = innertubeError instanceof Error ? innertubeError.message : 'YouTube audio extraction failed.';
        throw new Error(`${message} Install yt-dlp for reliable YouTube imports: python -m pip install -U yt-dlp`);
    }
}
async function resolveYouTubeTranscriptionUrl(youtubeUrl) {
    const videoId = (0, youtubeUtils_1.parseYouTubeVideoId)(youtubeUrl);
    if (!videoId) {
        throw new Error('Invalid YouTube URL.');
    }
    return resolveYouTubeAudioUrl(videoId);
}
async function downloadYouTubeAudio(youtubeUrl, lectureId) {
    const videoId = (0, youtubeUtils_1.parseYouTubeVideoId)(youtubeUrl);
    if (!videoId) {
        throw new Error('Invalid YouTube URL.');
    }
    const relativePath = `${lectureId}.webm`;
    const absolutePath = (0, storage_1.getAbsolutePath)(storage_1.LECTURES_CATEGORY, relativePath);
    if ((0, fs_1.existsSync)(absolutePath)) {
        return (0, storage_1.buildFileUrl)(storage_1.LECTURES_CATEGORY, relativePath);
    }
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let downloaded = false;
    let lastError = null;
    for (const runner of discoverYtDlpRunners()) {
        try {
            await execFileAsync(runner.command, [
                ...runner.prefix,
                '-f',
                'bestaudio/best',
                '-o',
                absolutePath,
                ...YT_DLP_ARGS,
                watchUrl,
            ], { timeout: 180_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
            if ((0, fs_1.existsSync)(absolutePath)) {
                downloaded = true;
                break;
            }
        }
        catch (err) {
            lastError = err;
            // try next runner
        }
    }
    if (!downloaded) {
        // Attempt fallback with Innertube and fetching
        try {
            const directUrl = await resolveViaInnertube(videoId);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60_000);
            const response = await fetch(directUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error(`Failed to fetch YouTube audio stream (${response.status})`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            const fs = require('fs');
            fs.writeFileSync(absolutePath, buffer);
            downloaded = true;
        }
        catch (fallbackError) {
            throw new Error(`Failed to download YouTube audio. yt-dlp download failed: ${lastError?.message || lastError}. Fallback failed: ${fallbackError}`);
        }
    }
    return (0, storage_1.buildFileUrl)(storage_1.LECTURES_CATEGORY, relativePath);
}
