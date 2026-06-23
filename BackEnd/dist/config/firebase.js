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
exports.admin = void 0;
const admin = __importStar(require("firebase-admin"));
exports.admin = admin;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function getCredential() {
    const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (envKey) {
        try {
            return JSON.parse(envKey);
        }
        catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env string:', e);
        }
    }
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        catch (e) {
            console.error('Failed to parse Firebase credential file at path:', filePath, e);
        }
    }
    console.warn('No service account credentials found. Falling back to applicationDefault credentials.');
    return admin.credential.applicationDefault();
}
const credential = getCredential();
if (admin.apps.length === 0) {
    const isServiceAccount = typeof credential === 'object' &&
        credential !== null &&
        ('project_id' in credential || 'projectId' in credential);
    admin.initializeApp({
        credential: isServiceAccount
            ? admin.credential.cert(credential)
            : credential,
    });
}
