// workbox-config.js
module.exports = {
    globDirectory: "public/",
    globPatterns: [
      "**/*.{html,js,css,png,jpg,svg,woff2,ico,json}"
    ],
    swDest: "public/service-worker.js",
    ignoreURLParametersMatching: [
      /^utm_/,
      /^fbclid$/
    ],
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/api\.exchangerate-api\.com/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-responses",
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
    ],
  };