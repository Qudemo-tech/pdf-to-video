"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToGCS = uploadBufferToGCS;
exports.uploadFileToGCS = uploadFileToGCS;
exports.getPublicUrl = getPublicUrl;

const { Storage } = require("@google-cloud/storage");

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "pdftovideo";

const storageOptions = {};
if (process.env.GCS_KEY_FILE) {
    storageOptions.keyFilename = process.env.GCS_KEY_FILE;
}
console.log('[GCS] Initializing with bucket:', BUCKET_NAME, '| keyFile:', process.env.GCS_KEY_FILE || '(using ADC)');
const storage = new Storage(storageOptions);
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload a Buffer to GCS.
 * Returns the public URL.
 */
async function uploadBufferToGCS(buffer, destination, contentType) {
    console.log('[GCS] Uploading buffer to:', destination);
    const file = bucket.file(destination);
    await file.save(buffer, {
        metadata: { contentType },
        resumable: false,
        public: true,
    });
    const url = getPublicUrl(destination);
    console.log('[GCS] Buffer upload success:', url);
    return url;
}

/**
 * Upload a local file to GCS.
 * Returns the public URL.
 */
async function uploadFileToGCS(localPath, destination, contentType) {
    console.log('[GCS] Uploading file to:', destination, '| from:', localPath);
    await bucket.upload(localPath, {
        destination,
        metadata: { contentType },
        resumable: false,
        public: true,
    });
    const url = getPublicUrl(destination);
    console.log('[GCS] File upload success:', url);
    return url;
}

function getPublicUrl(destination) {
    return `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
}
