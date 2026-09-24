/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [25, 50, 75, 100],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        // Vercel Blob CDN — uploaded project images
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  sassOptions: {
    compiler: 'modern',
    silenceDeprecations: ['legacy-js-api'],
  },
  transpilePackages: ['@once-ui-system/core'],
};

export default nextConfig;
