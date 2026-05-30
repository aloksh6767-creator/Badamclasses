import { getNextDistDirForConfig } from "./scripts/next-dist-dir.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: getNextDistDirForConfig(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  }
};

export default nextConfig;
