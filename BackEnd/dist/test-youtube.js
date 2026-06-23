"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const youtubeService_1 = require("./services/youtubeService");
async function main() {
    console.log('Resolving audio URL for video ID 60GaSpOnA48...');
    try {
        const url = await (0, youtubeService_1.resolveYouTubeAudioUrl)('60GaSpOnA48');
        console.log('Resolved URL:', url);
    }
    catch (error) {
        console.error('Resolution failed with error:', error);
        if (error.stack)
            console.error(error.stack);
    }
}
main();
