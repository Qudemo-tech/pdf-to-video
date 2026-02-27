import { NextRequest, NextResponse } from 'next/server';
import { generatePageScripts } from '@/lib/anthropic';
import { GeneratePageScriptsRequest, GeneratePageScriptsResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<GeneratePageScriptsResponse>> {
  try {
    const body: GeneratePageScriptsRequest = await request.json();

    if (!body.textByPage || body.textByPage.length === 0) {
      return NextResponse.json(
        { success: false, error: 'textByPage is required' },
        { status: 400 }
      );
    }

    if (!body.fullText || body.fullText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'fullText is required' },
        { status: 400 }
      );
    }

    const scripts = await generatePageScripts(body.textByPage, body.fullText);

    return NextResponse.json({
      success: true,
      scripts,
    });
  } catch (error) {
    console.error('Page script generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate page scripts' },
      { status: 500 }
    );
  }
}
