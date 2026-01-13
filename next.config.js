/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NODE_ENV === 'production' && process.env.STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'polymarket.com',
      },
      {
        protocol: 'https',
        hostname: 'gamma-api.polymarket.com',
      },
      {
        protocol: 'https',
        hostname: '**.polymarket.com',
      },
      {
        protocol: 'https',
        hostname: 'polymarket-upload.s3.us-east-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.us-east-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude better-sqlite3 from client-side bundle
      config.externals = config.externals || []
      config.externals.push('better-sqlite3')
    } else {
      // For client-side, ensure bs58 is properly resolved
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig

