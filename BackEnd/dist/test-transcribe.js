"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const transcribeService_1 = require("./services/transcribeService");
const youtubeService_1 = require("./services/youtubeService");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function main() {
    console.log('Resolving audio URL for video ID 60GaSpOnA48...');
    try {
        const audioUrl = await (0, youtubeService_1.resolveYouTubeAudioUrl)('60GaSpOnA48');
        console.log('Resolved audio URL. Downloading and transcribing...');
        const result = await (0, transcribeService_1.transcribeFromUrl)(audioUrl);
        console.log('Transcription successful!');
        console.log('Text length:', result.text.length);
        console.log('First 500 chars:', result.text.slice(0, 500));
    }
    catch (error) {
        console.error('Transcription failed with error:', error);
        if (error.stack)
            console.error(error.stack);
    }
}
main();
