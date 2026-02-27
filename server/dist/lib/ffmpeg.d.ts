/**
 * Stitch multiple video URLs into a single MP4 using ffmpeg concat demuxer.
 * If imageUrls is provided, page videos (index > 0) are composited with
 * the corresponding page image as background (PiP style).
 * Returns the relative URL path to the output video.
 */
export declare function stitchVideos(videoUrls: string[], imageUrls?: string[]): Promise<string>;
