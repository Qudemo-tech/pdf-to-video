import { PDFParse } from 'pdf-parse';

interface PDFExtractResult {
  text: string;
  pageCount: number;
  characterCount: number;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractResult> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await pdf.getText();
  const infoResult = await pdf.getInfo();
  await pdf.destroy();

  const rawText = textResult.text || '';

  const text = rawText
    // Strip control characters except newlines and tabs
    .replace(/[^\x20-\x7E\n\t]/g, ' ')
    // Collapse multiple spaces
    .replace(/ {2,}/g, ' ')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const pageCount = infoResult.pages?.length ?? textResult.pages?.length ?? 0;

  return {
    text,
    pageCount,
    characterCount: text.length,
  };
}
