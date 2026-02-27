"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const pages_1 = require("../lib/pages");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, error: 'No file uploaded' });
            return;
        }
        if (file.mimetype !== 'application/pdf') {
            res.status(400).json({ success: false, error: 'File must be a PDF' });
            return;
        }
        const buffer = file.buffer;
        const imageUrls = await (0, pages_1.convertPDFToImages)(buffer);
        // Build full public URLs using RENDER_EXTERNAL_URL
        const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`;
        const fullUrls = imageUrls.map((url) => `${baseUrl}${url}`);
        // Build absolute local file paths for server-side PiP compositing
        const localPaths = imageUrls.map((url) => path_1.default.join(process.cwd(), 'public', url));
        res.json({
            success: true,
            imageUrls: fullUrls,
            localPaths,
            pageCount: imageUrls.length,
        });
    }
    catch (error) {
        console.error('Page conversion error:', error);
        res.status(500).json({ success: false, error: 'Failed to convert PDF pages to images' });
    }
});
exports.default = router;
