import type { NextConfig } from "next";

// Rewrites are compiled at build time: the Docker build passes
// API_INTERNAL_URL=http://api:8080 as a build arg.
const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // `next dev` writes to .next-dev so a production build (.next) can never
  // corrupt a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  poweredByHeader: false,
  // The browser talks to the Go API through the same origin, so session
  // cookies stay first-party and SameSite=Lax works.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
