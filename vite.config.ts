import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const cleanPublicDir = path.resolve('.vite-public-clean');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const IMAGE_SIZE_LIMIT = 500 * 1024; // 500KB

function checkImageSizes(dir: string) {
  const oversized: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      oversized.push(...checkImageSizes(fullPath));
      continue;
    }
    if (IMAGE_EXTS.has(path.extname(entry).toLowerCase()) && stat.size > IMAGE_SIZE_LIMIT) {
      oversized.push(`  ${entry} (${(stat.size / 1024).toFixed(0)}KB > 500KB limit)`);
    }
  }
  return oversized;
}

function buildCleanPublic() {
  if (fs.existsSync(cleanPublicDir)) fs.rmSync(cleanPublicDir, { recursive: true });
  fs.mkdirSync(cleanPublicDir);
  const src = path.resolve('public');

  const oversized = checkImageSizes(src);
  if (oversized.length > 0) {
    console.error('\n[image-check] Build aborted: oversized images found in public/:\n' + oversized.join('\n') + '\n');
    process.exit(1);
  }

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
