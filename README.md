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
│       │   ├── imageService.ts   # sharp 缩放 + 像素提取
│       │   └── matchingService.ts # 加权 RGB 距离颜色匹配
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
| `targetSize` | number \| "auto" | 预设尺寸（25/40/52/64/72/90/104/120/156/208）或自动等比缩放 |
| `maxSize` | number | auto 模式下的最大边长（1-300，默认 52） |

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

使用加权 RGB 距离（更适合人类视觉感知）：

```
distance = sqrt(2 × ΔR² + 4 × ΔG² + 4 × ΔB²)
```

对图片中的每个像素，在所选色卡中寻找距离最小的颜色作为匹配结果。

## 扩展指南

### 新增色卡
在 `assets/colors.json` 中添加新的顶层 key，系统自动识别。

### 新增预设尺寸
修改 `server/src/config.ts` 中的 `PRESET_SIZES` 数组和 `client/src/utils/constants.ts` 中的同名数组。

### 替换颜色匹配算法
修改 `server/src/services/matchingService.ts`，保持函数签名不变即可。
