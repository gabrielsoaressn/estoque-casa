import type { NextConfig } from "next";

// Export estático (pasta `out/`) — é o que o Capacitor empacota no APK Android.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
