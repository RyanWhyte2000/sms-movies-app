import type { NextConfig } from "next";

const backendUrl = (
  process.env.BACKEND_URL ??
  process.env.API_PROXY_ORIGIN ??
  "http://localhost:8080"
).replace(/\/$/, "");

if (!/^https?:\/\//.test(backendUrl)) {
  throw new Error("BACKEND_URL must be an absolute http(s) URL.");
}

const nextConfig: NextConfig = {
  // Produce a self-contained Node.js server for Azure App Service.
  output: "standalone",
  logging: {
    browserToTerminal: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
