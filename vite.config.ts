import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const cleanPublicDir = path.resolve('.vite-public-clean');

function buildCleanPublic() {
  if (fs.existsSync(cleanPublicDir)) fs.rmSync(cleanPublicDir, { recursive: true });
  fs.mkdirSync(cleanPublicDir);
  const src = path.resolve('public');
  for (const entry of fs.readdirSync(src)) {
    if (entry.includes(' ')) continue;
    const srcPath = path.join(src, entry);
    const destPath = path.join(cleanPublicDir, entry);
    try {
      fs.copyFileSync(srcPath, destPath);
    } catch {}
  }
}

buildCleanPublic();

export default defineConfig({
  plugins: [react()],
  publicDir: cleanPublicDir,
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react'],
          'vendor-seo': ['react-helmet-async'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
