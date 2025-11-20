import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  serverRuntimeConfig: {
    // Will only be available on the server side
    googleApiKey: process.env.GOOGLE_API_KEY,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    // For any variables that need to be exposed to the client, you can add them here.
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
