import { withSentryConfig } from '@sentry/nextjs';
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    '@solana/web3.js',
    '@solana/spl-token',
    'libsodium-wrappers',
    'bs58',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 's2.coinmarketcap.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  output: 'standalone',
};

export default withSentryConfig(nextConfig, {
  site: process.env.NEXT_PUBLIC_SITE_URL,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  telemetry: false,
});
