import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdf2pic', 'fluent-ffmpeg'],
};

export default nextConfig;
