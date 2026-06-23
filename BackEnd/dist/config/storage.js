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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENTS_CATEGORY = exports.LECTURES_CATEGORY = exports.UPLOADS_ROOT = void 0;
exports.ensureUploadDirs = ensureUploadDirs;
exports.getPublicBaseUrl = getPublicBaseUrl;
exports.buildFileUrl = buildFileUrl;
exports.getAbsolutePath = getAbsolutePath;
exports.resolveLocalPathFromUrl = resolveLocalPathFromUrl;
exports.assertUserOwnsRelativePath = assertUserOwnsRelativePath;
exports.deleteFileByUrl = deleteFileByUrl;
exports.readFileBufferFromUrl = readFileBufferFromUrl;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
exports.LECTURES_CATEGORY = 'lectures';
exports.DOCUMENTS_CATEGORY = 'documents';
function ensureUploadDirs() {
    for (const category of [exports.LECTURES_CATEGORY, exports.DOCUMENTS_CATEGORY]) {
        fs.mkdirSync(path.join(exports.UPLOADS_ROOT, category), { recursive: true });
    }
}
function getPublicBaseUrl() {
    const port = process.env.PORT || 5000;
    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
    return base.replace(/\/$/, '');
}
function buildFileUrl(category, relativePath) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${getPublicBaseUrl()}/uploads/${category}/${normalized}`;
}
function getAbsolutePath(category, relativePath) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolute = path.resolve(exports.UPLOADS_ROOT, category, normalized);
    const uploadsRootResolved = path.resolve(exports.UPLOADS_ROOT);
    if (!absolute.startsWith(uploadsRootResolved)) {
        throw new Error('Invalid file path.');
    }
    return absolute;
}
function resolveLocalPathFromUrl(fileUrl) {
    try {
        const url = new URL(fileUrl);
        const marker = '/uploads/';
        const markerIndex = url.pathname.indexOf(marker);
        if (markerIndex === -1)
            return null;
        const relative = url.pathname.slice(markerIndex + marker.length);
        const absolute = path.resolve(exports.UPLOADS_ROOT, ...relative.split('/'));
        const uploadsRootResolved = path.resolve(exports.UPLOADS_ROOT);
        if (!absolute.startsWith(uploadsRootResolved)) {
            return null;
        }
        return absolute;
    }
    catch {
        return null;
    }
}
function assertUserOwnsRelativePath(userId, relativePath) {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized.startsWith(`${userId}/`)) {
        throw new Error('Access denied.');
    }
}
function deleteFileByUrl(fileUrl) {
    const localPath = resolveLocalPathFromUrl(fileUrl);
    if (!localPath || !fs.existsSync(localPath)) {
        return false;
    }
    fs.unlinkSync(localPath);
    return true;
}
async function readFileBufferFromUrl(fileUrl) {
    const localPath = resolveLocalPathFromUrl(fileUrl);
    if (localPath && fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
    }
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file (${response.status}).`);
    }
    return Buffer.from(await response.arrayBuffer());
}
