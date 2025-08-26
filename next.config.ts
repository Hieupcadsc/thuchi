import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev,
  // buildExcludes: [/middleware-manifest.json$/], // Example: exclude files from caching by service worker
  // fallbacks: { // Example: fallback for offline pages
  //   document: '/offline', // will be served when user is offline
  // },
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Add path alias for @ symbol to ensure webpack resolves imports correctly
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': require('path').join(__dirname, 'src'),
    };

    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false,
        'fs': false,
        'net': false,
        'tls': false,
        'child_process': false,
      };
      
      // Exclude genkit and AI-related packages from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        'genkit': 'commonjs genkit',
        '@genkit-ai/googleai': 'commonjs @genkit-ai/googleai',
        '@genkit-ai/express': 'commonjs @genkit-ai/express',
        '@opentelemetry/api': 'commonjs @opentelemetry/api',
        '@opentelemetry/context-async-hooks': 'commonjs @opentelemetry/context-async-hooks',
      });
    }
    return config;
  },
  serverExternalPackages: ['genkit', '@genkit-ai/googleai', '@genkit-ai/express'],
};

export default withPWA(nextConfig);
