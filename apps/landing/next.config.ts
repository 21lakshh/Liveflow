import { withNextVideo } from "next-video/process";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/**', // Allow all paths from this domain
      },
      {
        protocol: 'https',
        hostname: 'api.microlink.io', // <--- ADD THIS BLOCK
        port: '',
        pathname: '/**',
      },
    ]
  },
};

export default withNextVideo(nextConfig);