"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const firebase_1 = require("../config/firebase");
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header.' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await firebase_1.admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Auth verification failed:', error);
        return res.status(401).json({ error: 'Invalid or expired authentication session.' });
    }
}
