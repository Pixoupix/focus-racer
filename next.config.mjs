/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Keep build checks disabled for faster builds (enable if needed for debugging)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Use SWC minifier (faster and less memory than Terser)
  swcMinify: true,
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    instrumentationHook: true,
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
