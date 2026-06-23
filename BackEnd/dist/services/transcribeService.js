"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeFromUrl = transcribeFromUrl;
const groq_1 = require("./groq");
const storage_1 = require("../config/storage");
const db_1 = require("../config/db");
function extensionFromContentType(contentType) {
    if (!contentType)
        return 'webm';
    if (contentType.includes('wav'))
        return 'wav';
    if (contentType.includes('mpeg') || contentType.includes('mp3'))
        return 'mp3';
    if (contentType.includes('mp4'))
        return 'mp4';
    if (contentType.includes('ogg'))
        return 'ogg';
    return 'webm';
}
function parseWavHeader(buffer) {
    if (buffer.length < 44)
        return null;
    const riff = buffer.toString('ascii', 0, 4);
    const wave = buffer.toString('ascii', 8, 12);
    if (riff !== 'RIFF' || wave !== 'WAVE')
        return null;
    // Search for fmt chunk
    let fmtOffset = -1;
    for (let i = 12; i < Math.min(buffer.length - 8, 100); i++) {
        if (buffer.toString('ascii', i, i + 4) === 'fmt ') {
            fmtOffset = i;
            break;
        }
    }
    if (fmtOffset === -1)
        return null;
    const numChannels = buffer.readUInt16LE(fmtOffset + 8);
    const sampleRate = buffer.readUInt32LE(fmtOffset + 12);
    const byteRate = buffer.readUInt32LE(fmtOffset + 16);
    const blockAlign = buffer.readUInt16LE(fmtOffset + 20);
    const bitsPerSample = buffer.readUInt16LE(fmtOffset + 22);
    // Search for data chunk
    let dataOffset = -1;
    for (let i = fmtOffset + 8; i < Math.min(buffer.length - 8, 1000); i++) {
        if (buffer.toString('ascii', i, i + 4) === 'data') {
            dataOffset = i;
            break;
        }
    }
    if (dataOffset === -1)
        return null;
    const dataSize = buffer.readUInt32LE(dataOffset + 4);
    const duration = dataSize / byteRate;
    return {
        numChannels,
        sampleRate,
        byteRate,
        blockAlign,
        bitsPerSample,
        dataOffset,
        dataSize,
        duration,
    };
}
function splitWavBuffer(buffer, wavInfo, chunkDurationSeconds) {
    const chunks = [];
    const byteRate = wavInfo.byteRate;
    const blockAlign = wavInfo.blockAlign;
    const dataOffset = wavInfo.dataOffset;
    const audioDataStart = dataOffset + 8;
    // Calculate chunk size in bytes, aligned to blockAlign
    const chunkSizeBytes = Math.floor((byteRate * chunkDurationSeconds) / blockAlign) * blockAlign;
    let offset = audioDataStart;
    while (offset < buffer.length) {
        const currentChunkSize = Math.min(chunkSizeBytes, buffer.length - offset);
        if (currentChunkSize <= 0)
            break;
        const audioChunk = buffer.subarray(offset, offset + currentChunkSize);
        // Construct new WAV header
        const header = Buffer.alloc(audioDataStart);
        buffer.copy(header, 0, 0, audioDataStart);
        // Update overall RIFF size (file size - 8)
        header.writeUInt32LE(header.length + audioChunk.length - 8, 4);
        // Update data subchunk size
        header.writeUInt32LE(audioChunk.length, dataOffset + 4);
        const wavFile = Buffer.concat([header, audioChunk]);
        chunks.push(wavFile);
        offset += currentChunkSize;
    }
    return chunks;
}
async function transcribeFromUrl(audioUrl, language, lectureId, subject) {
    const contentType = 'application/octet-stream';
    const buffer = await (0, storage_1.readFileBufferFromUrl)(audioUrl);
    let resolvedContentType = contentType;
    if (audioUrl.includes('.')) {
        const ext = audioUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
        if (ext === 'wav')
            resolvedContentType = 'audio/wav';
        else if (ext === 'mp3')
            resolvedContentType = 'audio/mpeg';
        else if (ext === 'webm')
            resolvedContentType = 'audio/webm';
        else if (ext === 'mp4')
            resolvedContentType = 'video/mp4';
        else if (ext === 'pdf')
            resolvedContentType = 'application/pdf';
    }
    const ext = extensionFromContentType(resolvedContentType);
    // Parse WAV header to check duration
    const wavInfo = parseWavHeader(buffer);
    const duration = wavInfo ? wavInfo.duration : 0;
    // We chunk if duration > 10 minutes (600 seconds)
    if (wavInfo && duration > 600) {
        const chunkDuration = 480; // 8 minutes per chunk
        const wavChunks = splitWavBuffer(buffer, wavInfo, chunkDuration);
        const totalChunks = wavChunks.length;
        let combinedText = '';
        let combinedSegments = [];
        let resolvedLanguage = language || 'en';
        for (let i = 0; i < totalChunks; i++) {
            // Update status in the database if lectureId is provided
            if (lectureId) {
                try {
                    const existing = await db_1.prisma.transcript.findFirst({
                        where: { lectureId },
                    });
                    if (existing) {
                        await db_1.prisma.transcript.update({
                            where: { id: existing.id },
                            data: { status: `transcribing_part_${i + 1}_of_${totalChunks}` },
                        });
                    }
                }
                catch (dbErr) {
                    console.error('Failed to update chunk status in database:', dbErr);
                }
            }
            // Transcribe chunk
            const chunkResult = await (0, groq_1.groqTranscribeBuffer)(wavChunks[i], `audio_part_${i + 1}.${ext}`, resolvedContentType, language, subject);
            if (chunkResult.language) {
                resolvedLanguage = chunkResult.language;
            }
            const chunkText = chunkResult.text?.trim() ?? '';
            if (chunkText) {
                combinedText += (combinedText ? ' ' : '') + chunkText;
            }
            // Shift segments timestamps by chunk offset
            const chunkOffsetSeconds = i * chunkDuration;
            const chunkSegments = (chunkResult.segments ?? []).map((seg, idx) => ({
                id: combinedSegments.length + idx,
                start: seg.start + chunkOffsetSeconds,
                end: seg.end + chunkOffsetSeconds,
                text: seg.text,
            }));
            combinedSegments = combinedSegments.concat(chunkSegments);
        }
        return {
            text: combinedText,
            language: resolvedLanguage,
            duration,
            segments: combinedSegments,
        };
    }
    // Fallback to normal transcription for short recordings or non-WAV
    return (0, groq_1.groqTranscribeBuffer)(buffer, `audio.${ext}`, resolvedContentType, language, subject);
}
