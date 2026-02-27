import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { convertPDFToImages } from '@/lib/pages';
import { ConvertPagesResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ConvertPagesResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageUrls = await convertPDFToImages(buffer);

    // Build full public URLs (for display/reference)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullUrls = imageUrls.map((url) => `${appUrl}${url}`);

    // Build absolute local file paths for server-side PiP compositing
    const localPaths = imageUrls.map((url) => path.join(process.cwd(), 'public', url));

    return NextResponse.json({
      success: true,
      imageUrls: fullUrls,
      localPaths,
      pageCount: imageUrls.length,
    });
  } catch (error) {
    console.error('Page conversion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to convert PDF pages to images' },
      { status: 500 }
    );
  }
}
