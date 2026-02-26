import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function saveNgheTinhAudioPlugin() {
  return {
    name: 'save-nghe-tinh-audio',
    configureServer(server: { middlewares?: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares?.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/__save-nghe-tinh-audio') {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk; });
          req.on('end', () => {
            try {
              const { token, base64 } = JSON.parse(body);
              if (token && base64) {
                const outDir = path.resolve(process.cwd(), 'public', 'audio', 'nghe-tinh', '1.0');
                fs.mkdirSync(outDir, { recursive: true });
                const safeName = String(token).replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
                const outPath = path.join(outDir, `${safeName}.mp3`);
                fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, path: outPath }));
              } else {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing token or base64' }));
              }
            } catch (e) {
              res.writeHead(500);
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const googleTtsKey = env.VITE_GOOGLE_TTS_API_KEY || env.VITE_GOOGLE_CLOUD_TTS_API_KEY || env.GOOGLE_TTS_API_KEY || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), saveNgheTinhAudioPlugin()],
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
