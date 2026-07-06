# Perler Beads 拼豆图纸转换器 🎨

将任意图片转换为拼豆像素图纸，匹配颜色卡并支持导出。

## 技术栈

- **后端**: Node.js + Express + TypeScript（ESM）
- **图像处理**: sharp（缩放 + 像素提取）
- **前端**: React 19 + Vite + TypeScript
- **导出**: Canvas 2D API 绘制图纸 PNG

## 快速开始

```bash
# 安装依赖（根目录）
npm install

# 启动开发服务器（服务端 + 客户端并行）
npm run dev

# 服务端：http://localhost:3001
# 客户端：http://localhost:5173
```

## 项目结构

```
Perler_Beads/
├── assets/
│   └── colors.json              # 色卡数据（mard/coco 各 221 色）
├── server/                      # 服务端
│   └── src/
│       ├── index.ts             # 入口
│       ├── app.ts               # Express 应用工厂
│       ├── config.ts            # 预设尺寸、常量
│       ├── types/index.ts       # 类型定义
│       ├── services/
│       │   ├── colorService.ts   # 色卡加载与解析
│       │   ├── colorSpaceService.ts # sRGB→Lab 颜色空间转换
│       │   ├── imageService.ts   # sharp 缩放 + 像素提取
│       │   ├── matchingService.ts # CIE Lab ΔE 颜色匹配 + 色块平滑
│       │   └── quantizationService.ts # K-Means++ 颜色聚类
│       ├── middleware/
│       │   ├── upload.ts        # multer 文件上传
│       │   └── errorHandler.ts  # 全局错误处理
│       └── routes/
│           ├── palettes.ts      # GET /api/palettes
│           ├── colors.ts        # GET /api/colors/:mode
│           └── convert.ts       # POST /api/convert
├── client/                      # 前端
│   └── src/
│       ├── App.tsx              # 主应用（表单/预览视图切换）
│       ├── api/client.ts        # axios 封装
│       ├── hooks/
│       │   └── useAppState.ts   # useReducer 状态管理
│       ├── components/
│       │   ├── ConverterForm.tsx # 上传表单
│       │   ├── PaletteSelect.tsx # 色卡模式选择
│       │   ├── ImageUpload.tsx   # 图片拖拽上传
│       │   ├── SizeSelector.tsx  # 尺寸选择器
│       │   ├── PreviewArea.tsx   # 转换结果预览
│       │   ├── PixelGrid.tsx     # 像素网格 (CSS Grid)
│       │   ├── MaterialsList.tsx # 用料清单
│       │   ├── ExportCanvas.tsx  # Canvas 导出 PNG
│       │   └── ActionBar.tsx     # 操作按钮栏
│       └── utils/
│           ├── constants.ts     # 前端常量
│           ├── contrast.ts      # 文字对比度计算
│           └── sizing.ts        # 等比缩放计算
└── tsconfig.base.json           # 共享 TS 配置
```

## API 接口

### `GET /api/palettes`
返回可用的色卡模式名称列表。

```json
{ "palettes": ["mard", "coco"] }
```

### `GET /api/colors/:mode`
返回指定色卡模式的颜色数据。

### `POST /api/convert`
上传图片并进行颜色匹配转换。

**参数** (`multipart/form-data`):
| 参数 | 类型 | 说明 |
|------|------|------|
| `image` | File | 图片文件 |
| `mode` | string | 色卡模式（如 "mard"） |
| `colorFile` | string | 颜色数量文件："full"（290全量色）或 "221"（221基础色），默认 "full" |
| `targetSize` | number \| "auto" | 预设尺寸（25/40/52/64/72/90/104/120/156/208）或自动等比缩放 |
| `maxSize` | number | auto 模式下的最大边长（1-300，默认 52） |
| `tolerance` | number | 色块平滑强度 0-100（0=关闭），合并视觉相近的色块，减少孤立噪声 |
| `numColors` | number | K-Means++ 颜色聚类数量 0-50（0=关闭），压缩图片总颜色数、保留主色调 |

**返回**:
```json
{
  "mode": "mard",
  "width": 52,
  "height": 52,
  "grid": [[{ "hex": "faf5cd", "mark": "A1", "distance": 12.5 }]],
  "materials": [{ "name": "A1", "hex": "faf5cd", "count": 120 }]
}
```

## 颜色匹配算法

使用 CIE Lab ΔE (CIE76) 色差公式进行感知颜色匹配：

```
1. sRGB像素 → 线性 RGB → CIE XYZ (D65) → CIE L*a*b*
2. 色卡颜色在加载时预计算 Lab 值
3. 对每个像素在所选色卡中寻找 ΔE 最小的颜色作为匹配结果
```

ΔE ≈ 2.3 为"刚能察觉的差异"(JND)，相较于简单 RGB 距离更能准确反映人眼对颜色的感知差异。

## 扩展指南

### 新增色卡
在 `assets/colors.json` 中添加新的顶层 key，系统自动识别。

### 新增预设尺寸
修改 `server/src/config.ts` 中的 `PRESET_SIZES` 数组和 `client/src/utils/constants.ts` 中的同名数组。

### 替换颜色匹配算法
修改 `server/src/services/matchingService.ts` 中的 `findBestMatch` 函数，保持函数签名不变即可。

### 启用服务端静态文件部署

```bash
# 构建客户端后服务端可直接提供静态文件
npm run build
cd server && npm start
# 访问 http://localhost:3001
```
构建后 server 自动检测 `client/dist/index.html` 并切换到生产模式提供服务。
