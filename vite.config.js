import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@firebase/app': '@firebase/app',
    }
  },
  optimizeDeps: {
    exclude: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database']
  },
  plugins: [
    tailwindcss(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['StudAI_Logo-white.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        cleanupOutdatedCaches: true,
        sourcemap: false,
        navigateFallbackDenylist: [/^\/auth\//, /^\/api\//],
        // Cache API responses for offline use
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/(notes|plans)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      },
      manifest: {
        name: 'StudAI',
        short_name: 'StudAI',
        description: 'AI-powered study companion with notes, quizzes, and more',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4f46e5',
        icons: [
          {
            src: '/StudAI_Logo-white.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/StudAI_Logo-white.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', '@headlessui/react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})