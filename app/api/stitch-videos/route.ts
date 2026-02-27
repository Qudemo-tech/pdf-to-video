import { NextRequest, NextResponse } from 'next/server';
import { stitchVideos } from '@/lib/ffmpeg';
import { StitchVideosRequest, StitchVideosResponse } from '@/types';

export const maxDuration = 300; // Allow up to 5 minutes for video processing

export async function POST(request: NextRequest): Promise<NextResponse<StitchVideosResponse>> {
  try {
    const body: StitchVideosRequest = await request.json();

    if (!body.videoUrls || body.videoUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'videoUrls array is required' },
        { status: 400 }
      );
    }

    if (body.videoUrls.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 video URLs are required for stitching' },
        { status: 400 }
      );
    }

    const outputUrl = await stitchVideos(body.videoUrls, body.imageUrls);

    return NextResponse.json({
      success: true,
      outputUrl,
    });
  } catch (error) {
    console.error('Video stitching error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stitch videos' },
      { status: 500 }
    );
  }
}
