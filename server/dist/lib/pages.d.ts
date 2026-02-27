/**
 * Convert each page of a PDF to a JPEG image.
 * Returns an array of relative URL paths like /temp-pages/page-1.jpg
 */
export declare function convertPDFToImages(pdfBuffer: Buffer): Promise<string[]>;
