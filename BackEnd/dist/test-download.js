"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const youtubeService_1 = require("./services/youtubeService");
async function main() {
    console.log('Resolving audio URL for video ID 60GaSpOnA48...');
    const audioUrl = await (0, youtubeService_1.resolveYouTubeAudioUrl)('60GaSpOnA48');
    console.log('Resolved audio URL:', audioUrl);
    console.log('Fetching URL with 10s timeout...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
        const start = Date.now();
        const response = await fetch(audioUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        console.log('Response status:', response.status);
        const buffer = await response.arrayBuffer();
        console.log(`Downloaded ${buffer.byteLength} bytes in ${(Date.now() - start) / 1000}s`);
    }
    catch (error) {
        console.error('Fetch failed:', error.message || error);
    }
}
main();
