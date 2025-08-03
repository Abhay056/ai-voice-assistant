/** @type {import('next').NextConfig} */
const path = require('path');
const WorkboxPlugin = require('workbox-webpack-plugin');

const nextConfig = {
  webpack(config, { isServer, dev }) {
    if (!isServer && !dev) {
      // Define the path to your custom service worker
      const swSrc = path.join(__dirname, './src/lib/sw.js');

      config.plugins.push(
        new WorkboxPlugin.InjectManifest({
          swSrc,
          swDest: 'sw.js', // Output file in the 'public' folder
          // Any other Workbox options
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
