import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

// Chỉ ở chế độ dev: cho trang tools/bake.html ghi file asset đã bake vào public/assets/.
// Tên file bị giới hạn ở chữ, số, gạch, chấm để không ghi ra ngoài thư mục.
function saveAssetsPlugin() {
  const dir = path.resolve(import.meta.dirname, 'public/assets');
  return {
    name: 'save-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[\w-]+\.(png|json)$/.test(name)) {
          res.statusCode = 400;
          return res.end('tên không hợp lệ');
        }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [saveAssetsPlugin()],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 2000 },
});
