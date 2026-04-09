import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function copyPublicWithoutSpaces() {
  return {
    name: 'copy-public-without-spaces',
    generateBundle() {},
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir || 'dist';
      const publicDir = path.resolve('public');
      function copyDir(src: string, dest: string) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
          if (entry.includes(' ')) continue;
          const srcPath = path.join(src, entry);
          const destPath = path.join(dest, entry);
          const stat = fs.statSync(srcPath);
          if (stat.isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      }
      copyDir(publicDir, outDir);
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPublicWithoutSpaces()],
  publicDir: false,
  server: {
    port: 5173,
  },
});
