/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript typed routes
  typedRoutes: true,
  
  // External packages for server components
  serverExternalPackages: ['@neondatabase/serverless'],
  // Keep API routes working as they are
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Environment variables prefix for client-side access
  env: {
    // Add any environment variables you need on the client side here
  },
  // Handle image optimization
  images: {
    domains: ['localhost'],
  },
  // Webpack config for compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;