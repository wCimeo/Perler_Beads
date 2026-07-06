# 拼豆图纸转换算法优化设计

**日期:** 2026-07-06  
**状态:** 已批准  
**影响范围:** `server/src/services/`, `server/src/config.ts`, `server/src/routes/convert.ts`

## 目标

减少颜色失真并提升视觉纯净度。具体解决三个问题：
1. ΔE 匹配引入图中不存在的颜色
2. 孤立杂色过多
3. 精细部分色块破碎、轮廓模糊

## 当前管线

```
图片上传 → sharp缩放 → K-Means++聚类(可选) → ΔE色板匹配 → 色块平滑(可选) → 输出
```

## 新管线

```
图片上传 → sharp缩放 → Sobel边缘检测 → K-Means++聚类 → 空间平滑(跳过边缘) → 加权Lab色板映射 → 构建用料 → 输出
```

核心改动：将三项改进（空间约束、色板限制、边缘保护）融合为一次统一的优化过程。

## 阶段 1：Sobel 边缘检测

在缩放后的像素数据上运行 Sobel 算子，生成边缘掩膜 `edgeMask[y][x]`。

**Sobel 核（3×3）：**
```
Gx = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
Gy = [[-1,-2,-1], [ 0, 0, 0], [ 1, 2, 1]]
```

对灰度图（RGB 均值）计算梯度幅值 `sqrt(Gx² + Gy²)`，使用自适应阈值二值化：取幅值的 85 分位数作为阈值，幅值 > 阈值的像素标记为边缘。

**新文件：** `server/src/services/edgeDetectionService.ts`

## 阶段 2：K-Means++ 聚类（保持不变）

现有 `quantizationService.ts` 保持不变。聚类在 RGB 空间进行，输出聚类标签和质心。

## 阶段 3：空间连通性平滑

在 K-Means++ 收敛后的标签图上，对非边缘像素施加 5×5 高斯加权邻域投票。

**算法：** 每个非边缘像素的最终标签由其邻域中得票最多的聚类标签决定。投票权重服从高斯核 `exp(-dist² / (2σ²))`，σ=1.5。边缘像素保持原始标签不变。

**效果：** 减少孤立像素，合并小碎片为连通色块，同时保护轮廓。

**新文件：** `server/src/services/spatialRefinementService.ts`

## 阶段 4：加权 Lab 色板映射

将 K-Means 聚类质心映射到真实拼豆色板，使用加权 Lab 距离。

**加权 Lab 距离公式：**
```
d = sqrt( wL²×(L₁-L₂)² + wA²×(A₁-A₂)² + wB²×(B₁-B₂)² )
```
其中 wL=1.5, wA=1.0, wB=1.0，强调亮度一致性。

替换 `matchingService.ts` 中的 `labDistance()` 函数。

## 参数配置

| 参数 | 默认值 | 位置 | 说明 |
|------|--------|------|------|
| `wL` | 1.5 | config.ts | L* 通道权重 |
| `wA` | 1.0 | config.ts | a* 通道权重 |
| `wB` | 1.0 | config.ts | b* 通道权重 |
| `spatialWindow` | 5 | config.ts | 邻域窗口大小 |
| `spatialSigma` | 1.5 | config.ts | 高斯核 σ |
| `edgePercentile` | 85 | config.ts | 边缘阈值分位数 |

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `server/src/services/edgeDetectionService.ts` | 新增 | Sobel 边缘检测 |
| `server/src/services/spatialRefinementService.ts` | 新增 | 空间连通性平滑 |
| `server/src/services/matchingService.ts` | 修改 | `labDistance()` → `weightedLabDistance()` |
| `server/src/services/colorSpaceService.ts` | 修改 | 导出 `weightedLabDistance()` |
| `server/src/config.ts` | 修改 | 新增权重和阈值参数 |
| `server/src/routes/convert.ts` | 修改 | 更新管线编排 |
| `server/src/services/__tests__/edgeDetectionService.test.ts` | 新增 | 边缘检测单元测试 |
| `server/src/services/__tests__/spatialRefinementService.test.ts` | 新增 | 空间平滑单元测试 |

## 风险与缓解

1. **色板映射去重**：多个 K-Means 质心可能映射到同一色板颜色 → 在映射阶段检测重复并保留
2. **性能**：Sobel O(width×height) + 空间投票 O(width×height×25) ≈ 26× 像素数，在 300×300 下约 2.3M 次操作，可忽略
3. **边缘阈值敏感度**：自适应分位数策略避免了固定阈值的图片依赖性
4. **向后兼容**：现有 `tolerance`（mergeSimilarColors）保持不变，与空间平滑互补；`numColors=0` 时跳过 K-Means 但仍执行边缘检测和空间平滑
