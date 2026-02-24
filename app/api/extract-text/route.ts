import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf';
import { ExtractTextResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ExtractTextResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded', code: 'NO_FILE' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    // 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be under 20MB', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await extractTextFromPDF(buffer);

    if (!result.text || result.text.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'This PDF appears to be a scanned image. Please upload a text-based PDF.',
          code: 'NO_TEXT_EXTRACTED',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      pageCount: result.pageCount,
      characterCount: result.characterCount,
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extract text from PDF', code: 'EXTRACTION_FAILED' },
      { status: 500 }
    );
  }
}
