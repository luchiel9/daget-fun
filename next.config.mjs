
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@solana/web3.js',
    '@solana/spl-token',
    'libsodium-wrappers',
    'bs58',
    'drizzle-orm',
    'postgres',
    'pino',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's2.coinmarketcap.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  output: 'standalone',
  productionBrowserSourceMaps: false,
  cacheMaxMemorySize: 0,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
