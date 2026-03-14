
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
    'discord-interactions',
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
};

export default nextConfig;
