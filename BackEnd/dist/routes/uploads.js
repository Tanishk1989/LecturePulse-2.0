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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const auth_1 = require("../middleware/auth");
const storage_1 = require("../config/storage");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
(0, storage_1.ensureUploadDirs)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 500 },
});
router.post('/', auth_1.requireAuth, upload.single('file'), (req, res) => {
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const relativePath = String(req.body.relativePath ?? '');
    const category = req.body.category === storage_1.DOCUMENTS_CATEGORY ? storage_1.DOCUMENTS_CATEGORY : storage_1.LECTURES_CATEGORY;
    try {
        (0, storage_1.assertUserOwnsRelativePath)(userId, relativePath);
        const absolutePath = (0, storage_1.getAbsolutePath)(category, relativePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, req.file.buffer);
        res.status(201).json({
            fileUrl: (0, storage_1.buildFileUrl)(category, relativePath),
            path: `${category}/${relativePath}`,
            category,
        });
    }
    catch (error) {
        console.error('[API] Upload failed:', error);
        return res.status(400).json({ error: (0, apiError_1.getSafeErrorMessage)(error, 'Upload failed.') });
    }
});
router.delete('/', auth_1.requireAuth, (req, res) => {
    const userId = req.user?.uid;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const { category, relativePath } = req.body;
    if (!relativePath) {
        return res.status(400).json({ error: 'relativePath is required.' });
    }
    const resolvedCategory = category === storage_1.DOCUMENTS_CATEGORY ? storage_1.DOCUMENTS_CATEGORY : storage_1.LECTURES_CATEGORY;
    try {
        (0, storage_1.assertUserOwnsRelativePath)(userId, relativePath);
        const absolutePath = (0, storage_1.getAbsolutePath)(resolvedCategory, relativePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
        res.json({ message: 'File deleted.' });
    }
    catch (error) {
        console.error('[API] Delete failed:', error);
        return res.status(400).json({ error: (0, apiError_1.getSafeErrorMessage)(error, 'Delete failed.') });
    }
});
exports.default = router;
