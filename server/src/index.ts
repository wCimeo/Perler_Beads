import { createApp } from './app.js';
import { getPalettes } from './services/colorService.js';
import { DEFAULT_PORT } from './config.js';

// 启动时预加载色卡到内存
console.log('加载色卡数据...');
const palettes = getPalettes();
const modeList = Array.from(palettes.keys());
console.log(`已加载 ${modeList.length} 套色卡：${modeList.join(', ')}`);
for (const [mode, colors] of palettes) {
  console.log(`  ${mode}: ${colors.length} 色`);
}

const app = createApp();

app.listen(DEFAULT_PORT, () => {
  console.log(`拼豆图纸转换器服务端已启动：http://localhost:${DEFAULT_PORT}`);
  console.log(`API 端点：`);
  console.log(`  GET  /api/palettes`);
  console.log(`  POST /api/convert`);
  console.log(`  GET  /api/health`);
});
