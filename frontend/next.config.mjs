import { getNextDistDirForConfig } from "./scripts/next-dist-dir.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: getNextDistDirForConfig(),
  async redirects() {
    return [
      {
        source: "/mock-pdfs/ssc-maths-chapterwise-6500-pyqs-3rd-edition-english.pdf",
        destination:
          "https://media.githubusercontent.com/media/aloksh6767-creator/Badamclasses/01b60f1370f4d1ce8dbf7fd13abcbe78ad5c977b/frontend/public/mock-pdfs/ssc-maths-chapterwise-6500-pyqs-3rd-edition-english.pdf",
        permanent: false
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-DNS-Prefetch-Control", value: "on" }
        ]
      },
      {
        source: "/:path*.webp",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }
        ]
      },
      {
        source: "/fonts/:path*.woff2",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }
        ]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com"
      }
    ]
  }
};

export default nextConfig;
