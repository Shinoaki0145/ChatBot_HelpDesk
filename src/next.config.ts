import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["googleapis", "mammoth", "pdf-parse"],
};

export default nextConfig;
