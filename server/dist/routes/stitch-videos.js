"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ffmpeg_1 = require("../lib/ffmpeg");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    try {
        const { videoUrls, imageUrls } = req.body;
        if (!videoUrls || videoUrls.length === 0) {
            res.status(400).json({ success: false, error: 'videoUrls array is required' });
            return;
        }
        if (videoUrls.length < 2) {
            res.status(400).json({ success: false, error: 'At least 2 video URLs are required for stitching' });
            return;
        }
        const relativePath = await (0, ffmpeg_1.stitchVideos)(videoUrls, imageUrls);
        // Return full URL so the Vercel frontend can access the video
        const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`;
        const outputUrl = `${baseUrl}${relativePath}`;
        res.json({
            success: true,
            outputUrl,
        });
    }
    catch (error) {
        console.error('Video stitching error:', error);
        res.status(500).json({ success: false, error: 'Failed to stitch videos' });
    }
});
exports.default = router;
