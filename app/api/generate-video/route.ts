import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/tavus';
import { GenerateVideoRequest, GenerateVideoResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<GenerateVideoResponse>> {
  try {
    const body: GenerateVideoRequest = await request.json();

    if (!body.script || body.script.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Script is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const result = await generateVideo(body.script, body.videoName, body.backgroundUrl);

    return NextResponse.json({
      success: true,
      videoId: result.video_id,
      hostedUrl: result.hosted_url,
      status: result.status,
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate video', code: 'VIDEO_GENERATION_FAILED' },
      { status: 502 }
    );
  }
}
