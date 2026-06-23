"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJsonFromAi = parseJsonFromAi;
function parseJsonFromAi(raw) {
    let text = raw.trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        text = fenced[1].trim();
    }
    try {
        return JSON.parse(text);
    }
    catch {
        // fall through to balanced-object extraction
    }
    const start = text.indexOf('{');
    if (start === -1)
        return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i += 1) {
        const ch = text[i];
        if (inString) {
            if (escaped) {
                escaped = false;
            }
            else if (ch === '\\') {
                escaped = true;
            }
            else if (ch === '"') {
                inString = false;
            }
            continue;
        }
        if (ch === '"') {
            inString = true;
        }
        else if (ch === '{') {
            depth += 1;
        }
        else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                try {
                    return JSON.parse(text.slice(start, i + 1));
                }
                catch {
                    return null;
                }
            }
        }
    }
    return null;
}
