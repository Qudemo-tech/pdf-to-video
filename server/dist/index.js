"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const convert_pages_1 = __importDefault(require("./routes/convert-pages"));
const stitch_videos_1 = __importDefault(require("./routes/stitch-videos"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Ensure public directories exist
const publicDir = path_1.default.join(process.cwd(), 'public');
const tempPagesDir = path_1.default.join(publicDir, 'temp-pages');
const outputDir = path_1.default.join(publicDir, 'output');
for (const dir of [publicDir, tempPagesDir, outputDir]) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
// CORS — allow Vercel frontend
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));
// Parse JSON bodies
app.use(express_1.default.json({ limit: '50mb' }));
// Serve static files (page images + output videos)
app.use('/temp-pages', express_1.default.static(tempPagesDir));
app.use('/output', express_1.default.static(outputDir));
// Multer for file uploads (in-memory)
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
// Routes
app.use('/api/convert-pages', upload.single('file'), convert_pages_1.default);
app.use('/api/stitch-videos', stitch_videos_1.default);
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
