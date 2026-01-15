/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    disableStaticImages: false,
  },
  webpack: (config, { isServer }) => {
    // Completely exclude sharp to prevent loading on Netlify
    config.externals = config.externals || []
    config.externals.push('sharp')

    // Handle node modules that are not available in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        sharp: false,
      }
    } else {
      // On server side, prevent sharp from being required
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
      }
    }

    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    })

    return config
  },
}

export default nextConfig
