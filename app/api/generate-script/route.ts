import { NextRequest, NextResponse } from 'next/server';
import { generateScript } from '@/lib/anthropic';
import { GenerateScriptRequest, GenerateScriptResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<GenerateScriptResponse>> {
  try {
    const body: GenerateScriptRequest = await request.json();

    if (!body.text || body.text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Text content is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const tone = body.tone || 'professional';
    const maxLengthSeconds = body.maxLengthSeconds || 120;

    const result = await generateScript(body.text, tone, maxLengthSeconds);

    return NextResponse.json({
      success: true,
      script: result.script,
      estimatedDurationSeconds: result.estimatedDurationSeconds,
      wordCount: result.wordCount,
    });
  } catch (error) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate script', code: 'SCRIPT_GENERATION_FAILED' },
      { status: 502 }
    );
  }
}
