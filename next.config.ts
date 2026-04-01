import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev,
});

const nextConfig: NextConfig = {
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
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': require('path').join(__dirname, 'src'),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'async_hooks': false,
        'fs': false,
        'net': false,
        'tls': false,
        'child_process': false,
      };

      config.externals = config.externals || [];
      config.externals.push({
        'genkit': 'commonjs genkit',
        '@genkit-ai/googleai': 'commonjs @genkit-ai/googleai',
        '@genkit-ai/express': 'commonjs @genkit-ai/express',
        '@opentelemetry/api': 'commonjs @opentelemetry/api',
        '@opentelemetry/context-async-hooks': 'commonjs @opentelemetry/context-async-hooks',
        'pg': 'commonjs pg',
        'pg-native': 'commonjs pg-native',
      });
    }
    return config;
  },
  serverExternalPackages: ['genkit', '@genkit-ai/googleai', '@genkit-ai/express'],
  experimental: {
    instrumentationHook: true,
  },
};

export default withPWA(nextConfig);
