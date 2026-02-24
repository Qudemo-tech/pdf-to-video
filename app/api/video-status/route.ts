import { NextRequest, NextResponse } from 'next/server';
import { getVideoStatus } from '@/lib/tavus';
import { VideoStatusResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<VideoStatusResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'videoId is required', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const result = await getVideoStatus(videoId);

    return NextResponse.json({
      success: true,
      videoId: result.video_id,
      status: result.status,
      hostedUrl: result.hosted_url,
      downloadUrl: result.download_url,
      errorMessage: result.error_message,
    });
  } catch (error) {
    console.error('Video status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get video status', code: 'VIDEO_NOT_FOUND' },
      { status: 502 }
    );
  }
}
