"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSCRIPT_LANGUAGE_RULE = exports.MATCH_LECTURE_OUTPUT_RULE = exports.STRICT_ENGLISH_OUTPUT_RULE = void 0;
exports.normalizeOutputLanguage = normalizeOutputLanguage;
function normalizeOutputLanguage(value) {
    return value === 'match' ? 'match' : 'en';
}
exports.STRICT_ENGLISH_OUTPUT_RULE = `OUTPUT LANGUAGE (mandatory):
All generated study content must be written in English only — including summaries, notes, definitions, flashcards, quiz questions, exam tips, headings, and explanations.
Never use Hindi, Hinglish, or Devanagari script in generated study outputs, even when the source lecture or transcript is in another language.
The source transcript may remain in its original language; all study materials you produce must be English.`;
exports.MATCH_LECTURE_OUTPUT_RULE = `OUTPUT LANGUAGE:
Match the language of the source lecture/transcript in your generated study outputs (English, Hindi, Hinglish, etc.).`;
exports.TRANSCRIPT_LANGUAGE_RULE = `TRANSCRIPT LANGUAGE:
If cleaning or transcribing Hindi speech, write the transcript in Hinglish (Hindi words in Roman/Latin script). Do not use Devanagari script.
If the speech is in English, keep it in English. Do not translate the transcript to another language.`;
