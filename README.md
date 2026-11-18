<p align="right"><a href="README.en.md">English</a></p>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Win98 屏保 — 青色桌面与藏青标题栏，右侧 CRT 显示器里星点从中心向外飞掠，下方是彩色 3D 管道">
</p>

<p align="center">
  <a href="https://xiaosang.cc/win98-screen-saver/">▶ 在线体验</a>
  ·
  <a href="https://github.com/holynova/win98-screen-saver">GitHub 仓库</a>
</p>

Windows 95/98 经典屏幕保护程序的纯网页版复刻：11 个经典动画全部用前端重写（Canvas 2D + WebGL），没有系统镜像、原始 SCR 文件或后端服务。CRT 显示器框里实时预览，右侧调参即时生效，参数自动保存到本机；点「全屏欣赏」进入真正的屏保模式，动鼠标、点按或按任意键退出。

## 截图

<p align="center">
  <img src="./assets/readme/screenshot.png" width="800" alt="主界面：青色桌面上的银灰窗口，左侧 CRT 显示器实时预览飞越星空，右侧显示选项面板有星星密度与飞行速度滑杆">
</p>

## 11 个屏保

| 屏保 | 画面 |
| --- | --- |
| 飞越星空 | 白色星点从画面中心高速掠过，自动填满任何宽高比 |
| 3D 管道 | 恒定半径的彩色圆管沿三维格点生长，光亮弯管与球形接头穿过黑色空间 |
| 3D 迷宫 | 在红砖墙、木地板、方格天花板之间自动寻路，找黄色笑脸出口 |
| 3D 花盒 | 低多边形彩色几何体缓慢旋转、反弹，像机械花朵一样呼吸开合 |
| 3D 飞行物体 | Windows 标志、爆炸、丝带、飞溅、纹理旗帜在屏幕中悬浮变化 |
| 3D 文字 | 厚重闪亮的立体文字在黑色空间中反弹（输入 `volcano` 有隐藏文字） |
| 变幻线 | 彩色多边形在黑色空间反弹，留下层层叠加的霓虹轨迹 |
| 飞行的 Windows | 彩色四格窗口从远处飞来，保留 90 年代的低多边形节奏 |
| 曲线与色彩 | 连续生成明亮的贝塞尔曲线，以老式 VGA 色彩在黑幕上堆叠 |
| 滚动字幕 | 纯色背景上滚动自定义文字，支持经典随机位置模式 |
| 空白屏幕 | 最安静的经典屏保：只保留纯黑 |

## 功能

- **实时预览**：CRT 显示器框内实时播放，`ResizeObserver` 自适应窗口大小，适配 4:3、宽屏与超宽屏。
- **调参**：每个屏保有自己的控制项（滑杆/下拉/开关/文本/颜色），改动 120ms 后重启动画、即时生效。
- **自动保存**：所选屏保与每项参数存 `localStorage`（前缀 `win98-screen-saver:`），刷新后还在；一键恢复默认。
- **全屏屏保**：独立全屏引擎（DPR 上限 2），启动 800ms 后鼠标移动超过 18px、点按或按任意键即退出；浏览器不支持全屏时自动降级为铺满窗口。
- **关于弹窗**：经典 Win98 风格标题栏对话框，说明项目与版本（v0.1.0）。

## 技术

- TypeScript + Vite 8，`three` 0.185（WebGL 屏保），其余屏保走 Canvas 2D；构建输出 `docs/`（`tsc --noEmit && vite build`）。
- 每个屏保是独立模块（`src/savers/`），实现统一的 `SaverDefinition` 接口（id、名称、描述、默认值、控制项、`create`），引擎按 `dt` 驱动更新与渲染，每次切换用新种子重开。
- 测试：Vitest，3 个测试文件共 7 个用例（`math.test.ts`、`index.test.ts`、`maze.test.ts`），`npm test` 运行。

```
src/
  core/     engine.ts（主循环/DPR/尺寸自适应）、three-saver.ts、math.ts、types.ts、settings.ts
  savers/   11 个屏保各一模块 + index.ts 注册表
  ui/       app.ts（外壳、预览、全屏、关于弹窗）、icons.ts
  storage.ts  localStorage 读写（设置 + 当前选择）
```
