// Secret admin slug — change this to move the admin panel URL
const ADMIN_SLUG = "focus-mgr-7k9x";

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
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    instrumentationHook: true,
  },
  async redirects() {
    return [
      // Block direct /admin/ access — must use secret slug
      {
        source: '/admin/:path*',
        destination: '/404',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
      // Secret admin slug → internal /admin/ routes
      {
        source: `/${ADMIN_SLUG}/:path*`,
        destination: '/admin/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        // Security headers on all routes
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Prevent images from being indexed by reverse image search engines
        source: '/api/uploads/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
