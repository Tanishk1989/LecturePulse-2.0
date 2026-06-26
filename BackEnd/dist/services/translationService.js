"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateText = translateText;
const groq_1 = require("./groq");
async function translateText(text, targetLanguage, contextLabel = 'lecture content') {
    if (!text.trim())
        return '';
    const languageNames = {
        en: 'English',
        hi: 'Hindi',
        es: 'Spanish',
        fr: 'French',
        de: 'German',
        zh: 'Chinese',
        ar: 'Arabic',
    };
    const target = languageNames[targetLanguage] ?? targetLanguage;
    return (0, groq_1.groqChatCompletion)(`You are a precise academic translator. Translate ${contextLabel} to ${target}. Preserve structure, headings, and bullet points. Return only the translation.`, text.slice(0, 120000), { temperature: 0.2, skipEnhancement: true });
}
