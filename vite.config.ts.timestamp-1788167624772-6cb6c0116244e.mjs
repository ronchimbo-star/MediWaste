// vite.config.ts
import { defineConfig } from "file:///tmp/cc-agent/62473784/project/node_modules/vite/dist/node/index.js";
import react from "file:///tmp/cc-agent/62473784/project/node_modules/@vitejs/plugin-react/dist/index.js";
import fs from "fs";
import path from "path";
var cleanPublicDir = path.resolve(".vite-public-clean");
var IMAGE_EXTS = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
var IMAGE_SIZE_LIMIT = 500 * 1024;
function checkImageSizes(dir) {
  const oversized = [];
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
  const src = path.resolve("public");
  const oversized = checkImageSizes(src);
  if (oversized.length > 0) {
    console.error("\n[image-check] Build aborted: oversized images found in public/:\n" + oversized.join("\n") + "\n");
    process.exit(1);
  }
  for (const entry of fs.readdirSync(src)) {
    if (entry.includes(" ")) continue;
    const srcPath = path.join(src, entry);
    const destPath = path.join(cleanPublicDir, entry);
    try {
      fs.copyFileSync(srcPath, destPath);
    } catch {
    }
  }
}
buildCleanPublic();
var vite_config_default = defineConfig({
  plugins: [react()],
  publicDir: cleanPublicDir,
  server: {
    port: 5173,
    fs: {
      allow: [".."]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-icons": ["lucide-react"],
          "vendor-seo": ["react-helmet-async"]
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvdG1wL2NjLWFnZW50LzYyNDczNzg0L3Byb2plY3RcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi90bXAvY2MtYWdlbnQvNjI0NzM3ODQvcHJvamVjdC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vdG1wL2NjLWFnZW50LzYyNDczNzg0L3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGNsZWFuUHVibGljRGlyID0gcGF0aC5yZXNvbHZlKCcudml0ZS1wdWJsaWMtY2xlYW4nKTtcblxuY29uc3QgSU1BR0VfRVhUUyA9IG5ldyBTZXQoWycuanBnJywgJy5qcGVnJywgJy5wbmcnLCAnLndlYnAnLCAnLmdpZicsICcuYXZpZiddKTtcbmNvbnN0IElNQUdFX1NJWkVfTElNSVQgPSA1MDAgKiAxMDI0OyAvLyA1MDBLQlxuXG5mdW5jdGlvbiBjaGVja0ltYWdlU2l6ZXMoZGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qgb3ZlcnNpemVkOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGZzLnJlYWRkaXJTeW5jKGRpcikpIHtcbiAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihkaXIsIGVudHJ5KTtcbiAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgIG92ZXJzaXplZC5wdXNoKC4uLmNoZWNrSW1hZ2VTaXplcyhmdWxsUGF0aCkpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChJTUFHRV9FWFRTLmhhcyhwYXRoLmV4dG5hbWUoZW50cnkpLnRvTG93ZXJDYXNlKCkpICYmIHN0YXQuc2l6ZSA+IElNQUdFX1NJWkVfTElNSVQpIHtcbiAgICAgIG92ZXJzaXplZC5wdXNoKGAgICR7ZW50cnl9ICgkeyhzdGF0LnNpemUgLyAxMDI0KS50b0ZpeGVkKDApfUtCID4gNTAwS0IgbGltaXQpYCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdmVyc2l6ZWQ7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQ2xlYW5QdWJsaWMoKSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKGNsZWFuUHVibGljRGlyKSkgZnMucm1TeW5jKGNsZWFuUHVibGljRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgZnMubWtkaXJTeW5jKGNsZWFuUHVibGljRGlyKTtcbiAgY29uc3Qgc3JjID0gcGF0aC5yZXNvbHZlKCdwdWJsaWMnKTtcblxuICBjb25zdCBvdmVyc2l6ZWQgPSBjaGVja0ltYWdlU2l6ZXMoc3JjKTtcbiAgaWYgKG92ZXJzaXplZC5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS5lcnJvcignXFxuW2ltYWdlLWNoZWNrXSBCdWlsZCBhYm9ydGVkOiBvdmVyc2l6ZWQgaW1hZ2VzIGZvdW5kIGluIHB1YmxpYy86XFxuJyArIG92ZXJzaXplZC5qb2luKCdcXG4nKSArICdcXG4nKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cblxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGZzLnJlYWRkaXJTeW5jKHNyYykpIHtcbiAgICBpZiAoZW50cnkuaW5jbHVkZXMoJyAnKSkgY29udGludWU7XG4gICAgY29uc3Qgc3JjUGF0aCA9IHBhdGguam9pbihzcmMsIGVudHJ5KTtcbiAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihjbGVhblB1YmxpY0RpciwgZW50cnkpO1xuICAgIHRyeSB7XG4gICAgICBmcy5jb3B5RmlsZVN5bmMoc3JjUGF0aCwgZGVzdFBhdGgpO1xuICAgIH0gY2F0Y2gge31cbiAgfVxufVxuXG5idWlsZENsZWFuUHVibGljKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcHVibGljRGlyOiBjbGVhblB1YmxpY0RpcixcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBmczoge1xuICAgICAgYWxsb3c6IFsnLi4nXSxcbiAgICB9LFxuICB9LFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAndmVuZG9yLXJlYWN0JzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAndmVuZG9yLXJvdXRlcic6IFsncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICd2ZW5kb3ItcXVlcnknOiBbJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSddLFxuICAgICAgICAgICd2ZW5kb3Itc3VwYWJhc2UnOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxuICAgICAgICAgICd2ZW5kb3ItaWNvbnMnOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgICAgICd2ZW5kb3Itc2VvJzogWydyZWFjdC1oZWxtZXQtYXN5bmMnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDYwMCxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0USxTQUFTLG9CQUFvQjtBQUN6UyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBRWpCLElBQU0saUJBQWlCLEtBQUssUUFBUSxvQkFBb0I7QUFFeEQsSUFBTSxhQUFhLG9CQUFJLElBQUksQ0FBQyxRQUFRLFNBQVMsUUFBUSxTQUFTLFFBQVEsT0FBTyxDQUFDO0FBQzlFLElBQU0sbUJBQW1CLE1BQU07QUFFL0IsU0FBUyxnQkFBZ0IsS0FBYTtBQUNwQyxRQUFNLFlBQXNCLENBQUM7QUFDN0IsYUFBVyxTQUFTLEdBQUcsWUFBWSxHQUFHLEdBQUc7QUFDdkMsVUFBTSxXQUFXLEtBQUssS0FBSyxLQUFLLEtBQUs7QUFDckMsVUFBTSxPQUFPLEdBQUcsU0FBUyxRQUFRO0FBQ2pDLFFBQUksS0FBSyxZQUFZLEdBQUc7QUFDdEIsZ0JBQVUsS0FBSyxHQUFHLGdCQUFnQixRQUFRLENBQUM7QUFDM0M7QUFBQSxJQUNGO0FBQ0EsUUFBSSxXQUFXLElBQUksS0FBSyxRQUFRLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSyxLQUFLLE9BQU8sa0JBQWtCO0FBQ3JGLGdCQUFVLEtBQUssS0FBSyxLQUFLLE1BQU0sS0FBSyxPQUFPLE1BQU0sUUFBUSxDQUFDLENBQUMsbUJBQW1CO0FBQUEsSUFDaEY7QUFBQSxFQUNGO0FBQ0EsU0FBTztBQUNUO0FBRUEsU0FBUyxtQkFBbUI7QUFDMUIsTUFBSSxHQUFHLFdBQVcsY0FBYyxFQUFHLElBQUcsT0FBTyxnQkFBZ0IsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUNoRixLQUFHLFVBQVUsY0FBYztBQUMzQixRQUFNLE1BQU0sS0FBSyxRQUFRLFFBQVE7QUFFakMsUUFBTSxZQUFZLGdCQUFnQixHQUFHO0FBQ3JDLE1BQUksVUFBVSxTQUFTLEdBQUc7QUFDeEIsWUFBUSxNQUFNLHdFQUF3RSxVQUFVLEtBQUssSUFBSSxJQUFJLElBQUk7QUFDakgsWUFBUSxLQUFLLENBQUM7QUFBQSxFQUNoQjtBQUVBLGFBQVcsU0FBUyxHQUFHLFlBQVksR0FBRyxHQUFHO0FBQ3ZDLFFBQUksTUFBTSxTQUFTLEdBQUcsRUFBRztBQUN6QixVQUFNLFVBQVUsS0FBSyxLQUFLLEtBQUssS0FBSztBQUNwQyxVQUFNLFdBQVcsS0FBSyxLQUFLLGdCQUFnQixLQUFLO0FBQ2hELFFBQUk7QUFDRixTQUFHLGFBQWEsU0FBUyxRQUFRO0FBQUEsSUFDbkMsUUFBUTtBQUFBLElBQUM7QUFBQSxFQUNYO0FBQ0Y7QUFFQSxpQkFBaUI7QUFFakIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFdBQVc7QUFBQSxFQUNYLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLElBQUk7QUFBQSxNQUNGLE9BQU8sQ0FBQyxJQUFJO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsV0FBVztBQUFBLFVBQ3JDLGlCQUFpQixDQUFDLGtCQUFrQjtBQUFBLFVBQ3BDLGdCQUFnQixDQUFDLHVCQUF1QjtBQUFBLFVBQ3hDLG1CQUFtQixDQUFDLHVCQUF1QjtBQUFBLFVBQzNDLGdCQUFnQixDQUFDLGNBQWM7QUFBQSxVQUMvQixjQUFjLENBQUMsb0JBQW9CO0FBQUEsUUFDckM7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsRUFDekI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
