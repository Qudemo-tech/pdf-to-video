"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPDFToImages = convertPDFToImages;
const pdf2pic_1 = require("pdf2pic");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const TEMP_PAGES_DIR = path_1.default.join(process.cwd(), 'public', 'temp-pages');
/**
 * Convert each page of a PDF to a JPEG image.
 * Returns an array of relative URL paths like /temp-pages/page-1.jpg
 */
async function convertPDFToImages(pdfBuffer) {
    // Ensure output directory exists and is clean
    if (fs_1.default.existsSync(TEMP_PAGES_DIR)) {
        const existing = fs_1.default.readdirSync(TEMP_PAGES_DIR);
        for (const file of existing) {
            fs_1.default.unlinkSync(path_1.default.join(TEMP_PAGES_DIR, file));
        }
    }
    else {
        fs_1.default.mkdirSync(TEMP_PAGES_DIR, { recursive: true });
    }
    // Write PDF to a temp file (pdf2pic needs a file path)
    const tempPdfPath = path_1.default.join(TEMP_PAGES_DIR, 'input.pdf');
    fs_1.default.writeFileSync(tempPdfPath, pdfBuffer);
    // Get page count using pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(pdfBuffer);
    const pageCount = pdfData.numpages;
    const converter = (0, pdf2pic_1.fromPath)(tempPdfPath, {
        density: 150,
        saveFilename: 'page',
        savePath: TEMP_PAGES_DIR,
        format: 'jpg',
        width: 1920,
        height: 1080,
    });
    const imageUrls = [];
    for (let i = 1; i <= pageCount; i++) {
        const result = await converter(i, { responseType: 'image' });
        if (result.path) {
            const newName = `page-${i}.jpg`;
            const newPath = path_1.default.join(TEMP_PAGES_DIR, newName);
            if (result.path !== newPath) {
                fs_1.default.renameSync(result.path, newPath);
            }
            imageUrls.push(`/temp-pages/${newName}`);
        }
    }
    // Clean up temp PDF
    if (fs_1.default.existsSync(tempPdfPath)) {
        fs_1.default.unlinkSync(tempPdfPath);
    }
    return imageUrls;
}
