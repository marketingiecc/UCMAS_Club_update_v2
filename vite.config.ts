import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const googleTtsKey = env.VITE_GOOGLE_TTS_API_KEY || env.VITE_GOOGLE_CLOUD_TTS_API_KEY || env.GOOGLE_TTS_API_KEY || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_GOOGLE_TTS_API_KEY': JSON.stringify(googleTtsKey),
      },
      build: {
        rollupOptions: {
          output: {
            // Reduce main bundle size by splitting large deps into stable chunks.
            manualChunks: {
              react: ['react', 'react-dom'],
              router: ['react-router-dom', '@remix-run/router'],
              supabase: ['@supabase/supabase-js'],
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
