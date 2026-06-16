/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['axios', 'recharts'],
  },
  webpack: (config) => {
    config.node = { __dirname: true };
    return config;
  },
}

export default nextConfig
