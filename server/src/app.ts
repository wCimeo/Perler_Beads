import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import palettesRouter from './routes/palettes.js';
import colorsRouter from './routes/colors.js';
import convertRouter from './routes/convert.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Application {
  const app = express();
  const clientDist = resolve(__dirname, '../../client/dist');
  const hasBuild = existsSync(resolve(clientDist, 'index.html'));

  // CORS
  app.use(cors());

  // API routes
  app.use('/api/palettes', palettesRouter);
  app.use('/api/colors', colorsRouter);
  app.use('/api/convert', convertRouter);
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  if (hasBuild) {
    // Production mode: serve built SPA from client/dist
    app.use(express.static(clientDist));
    // SPA fallback: all non-API GET requests serve index.html
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(resolve(clientDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  } else {
    // Dev mode: API-only server, show friendly redirect on /
    app.get('/', (_req, res) => {
      const html = [
        '<!DOCTYPE html>',
        '<html lang="zh-CN">',
        '<head><meta charset="UTF-8"><title>Perler Beads Converter</title></head>',
        '<body style="font-family: sans-serif; max-width: 600px; margin: 80px auto; text-align: center;">',
        '  <h1>拼豆图纸转换器</h1>',
        '  <p>开发模式下请访问前端页面：</p>',
        '  <p><a href="http://localhost:5174" style="font-size: 1.2rem;">http://localhost:5174</a></p>',
        '  <p style="color: #7f8c8d; font-size: 0.85rem; margin-top: 2rem;">',
        '    API 运行在 localhost:3001，前端由 Vite 开发服务器在 5174 端口提供<br>',
        '    使用 <code>npm run dev</code> 同时启动两个服务',
        '  </p>',
        '</body></html>',
      ].join('\n');
      res.type('html').send(html);
    });
  }

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
