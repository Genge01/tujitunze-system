
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  // Development-only configuration.
  allowedDevOrigins: ["192.168.137.107"],
};

export default nextConfig;
