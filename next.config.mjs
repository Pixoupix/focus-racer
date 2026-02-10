/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "standalone", // Enable for Docker deployment
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    instrumentationHook: true,
  },
};

export default nextConfig;
