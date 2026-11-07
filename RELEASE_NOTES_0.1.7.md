# v0.1.7 — 修复官方 Editor 截图中数学公式未渲染（2026-10-19）

**基于 v0.1.6 的最小修复版。** 继续使用现有 MCP Server 和随包安装的官方 draw.io Editor，保留 v0.1.6 对 `spin:false` 的修复；不增加渲染库、不引入新服务、不恢复 Cursor Viewer 轮询。

## 问题

v0.1.6 在官方嵌入式 Editor 收到 `action:"export",format:"png",xml:...` 后，会在公式 MathJax 懒加载之前进入 Canvas 导出路径。带公式的 PNG 可能原样显示 `$$...$$`，工具仍返回成功。

## 修复

- `mcp-app-server/src/editor-host.js`：官方嵌入协议从“一步 export 附带 XML”调整为“`action:load` → `event:load` → 等待官方 `Editor.loadMath` → `Editor.MathJaxRender` → `action:export` **不再附带 XML**”。不再在准备好的图形上二次加载模型。
- 截图 Editor iframe 使用 `math=1`，容忍 XML 中包含 TeX 但漏写 `math="1"` 的情况。
- 公式渲染等待官方本地 MathJax bundle；排版完成后经两个浏览器绘制帧才启动导出；检验可见公式数量和对应 MathJax SVG 输出。无公式时直接执行导出，无需等 MathJax。
- 引擎缺失、MathJax 加载失败、排版失败或排版超时均**不保存 PNG**，返回明确的 `MATHJAX_RENDER_FAILED` 错误；不能悄悄返回带原始 LaTeX 的图片。
- `mcp-app-server/src/official-snapshot.js`：针对 MathJax 相关错误提供专用错误码和处理建议。
- `test/official-snapshot.test.js`：新增两阶段协议、公式必须等排版、无公式直通、公式输出缺失失败、MathJax bundle 不可用失败等回归测试，修改浏览器测试替身遵循官方 `load` 后 `export` 协议。

## 未改动

- 官方 draw.io Editor 源码和资源，现有 Viewer、Edit、人工编辑保存、MathJax 交互逻辑。
- `get_snapshot(name)`、`export_diagram(name,format:"png")` 对外接口及文件路径行为。
- headless Chrome/Edge/Chromium 执行环境和 CDP 控制机制。

## 验收与限制

- 已通过源代码级协议和模拟 MathJax 回归测试。
- **此环境没有打包好的官方 webapp 静态资源，且 Chromium 受策略限制无法访问 localhost；未在此环境实测官方 Editor 的真实数学公式 PNG**。请在用户本机用真实公式图（例如 `$$\\sqrt{\\frac{QK^T}{\\sqrt{d_k}}}$$`）执行 `create_diagram → get_snapshot`，并在不展开 Viewer 时检查 PNG。
- 完整测试组另有部分用例因本环境缺少 `@modelcontextprotocol/sdk` 与 `pako` 而无法运行。正式部署应在 `mcp-app-server` 执行 `npm ci`。

## 升级

覆盖 v0.1.6 源码、保留现有 `mcp-app-server/vendor/drawio-webapp` 官方资源，必要时在 `mcp-app-server` 运行 `npm ci`，重启 Cursor 中的 MCP Server。原有通过 `load_diagram` 恢复会话图的流程不变。
