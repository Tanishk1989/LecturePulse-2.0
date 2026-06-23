"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseYouTubeVideoId = parseYouTubeVideoId;
exports.isYouTubeUrl = isYouTubeUrl;
function parseYouTubeVideoId(url) {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') {
            return parsed.pathname.slice(1).split('/')[0] || null;
        }
        if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (parsed.pathname === '/watch') {
                return parsed.searchParams.get('v');
            }
            if (parsed.pathname.startsWith('/shorts/')) {
                return parsed.pathname.split('/')[2] || null;
            }
            if (parsed.pathname.startsWith('/embed/')) {
                return parsed.pathname.split('/')[2] || null;
            }
        }
    }
    catch {
        return null;
    }
    return null;
}
function isYouTubeUrl(url) {
    return parseYouTubeVideoId(url) !== null;
}
