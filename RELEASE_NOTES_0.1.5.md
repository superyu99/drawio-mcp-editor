# v0.1.5 — 官方 Editor 独立截图路径（实验版，2026-10-19）

以 **v0.1.4** 为基础，保留 Viewer、Edit/Finish editing、MathJax、多人修改事件、命名与 `load_diagram`，仅改 Agent 截图路径。

- `get_snapshot({name})`：直接读取 MCP Server 中该名称最新 `.drawio` XML；使用随包提供的**官方 draw.io Editor** 的 `action:"export",format:"png"` 嵌入协议渲染，校验 PNG，返回唯一临时绝对路径。Viewer 无须展开或处于运行状态。
- `export_diagram({name,format:"png"})`：同一独立导出路径，保存到稳定文件名。
- 旧的 `SnapshotBridge`、`poll_snapshot`、`snapshot_progress`、`submit_snapshot` 和 Viewer 截图轮询已从运行代码移除。`list_diagrams()` 不再列出用于截图判断的 `activeNames`。
- 后端不重写图形、连线或公式渲染。**官方 Editor 的 Canvas 实现需要真正的网页运行环境**；MCP Server 按需启动本机 Chrome/Edge/Chromium 的隔离无头实例，使用 Node.js 22 内置 WebSocket 与浏览器 DevTools 通信。**没有另建一个 MCP Server，也不引入 Puppeteer/Playwright/NPM 渲染依赖。**
- 用户已安装 Chrome/Edge/Chromium 通常无需增加软件；不能自动检测时设置 `DRAWIO_BROWSER_PATH` 为浏览器可执行文件的绝对路径。可通过 `DRAWIO_OFFICIAL_EXPORT_TIMEOUT_MS` 调整总超时（默认 60000 ms）。
- 完整官方 Editor 静态文件必须仍在 `mcp-app-server/vendor/drawio-webapp/` 或由 `DRAWIO_EDITOR_DIR` 指定；**源码 ZIP 不包含已下载的官方完整网页资产**，需沿用原有目录，或按 `scripts/bundle-editor.sh` 安装。
- Agent 成功得到的仍只有 `drawio-<uuid>.png` 路径。缺 Editor、缺浏览器、浏览器被策略禁止导航、公式或 PNG 导出失败时返回结构化 JSON 错误，不允许用老截图代替。

## 测试与已知边界

- 已检查 Node.js 语法、官方 `export` 消息协议封装、模拟 Editor 的 `init/export` 交互、PNG 校验与新旧调用链解耦。
- **真实官方 Editor + 真正 PNG 尚未在本环境完成端到端验证**：所附源码包也不含完整官方网页资源；此外本环境 Chromium 被管理员 `URLBlocklist:["*"]` 禁止访问本地 HTTP 地址，测试会明确跳过。需要在装有官方资源与未限制本地网页访问的 Windows/Ubuntu 用户机器完成实机验收。
- 官方导出在当前 `get_snapshot` 中选择 XML 的**第一页**，而不是把多页拼成一张图。导出图片的完整边界由官方 Editor 决定。
- 公式、HTML 富文本和复杂 stencil 尚需用用户真实 GRPO/Transformer 图测试。不要把模拟协议通过等同于完整渲染正确。

## 安装

1. 用 v0.1.5 源码覆盖现有工作代码，**保留原有 `vendor/drawio-webapp/`** 官方完整资源目录。
2. 在 `mcp-app-server` 运行 `npm ci`，使用 Node.js 22+。若资源缺失，先运行 `bash scripts/bundle-editor.sh` （需要联网）。
3. 重启 Cursor 对应的 MCP 进程；用 `list_diagrams` 观察本进程图集，然后在新会话或用 `load_diagram` 恢复已保存图。
4. 不展开 Viewer，直接调用 `get_snapshot({name:"grpo-training"})`；再检查图片是否完整、公式是否正确。
5. 如果收到 `BROWSER_NOT_FOUND`，在本机设置 `DRAWIO_BROWSER_PATH` 指向 Chrome / Edge / Chromium，然后重启 MCP Server。浏览器如受公司策略禁止访问 127.0.0.1，会直接报告 `BROWSER_NAVIGATION_FAILED`，不会假称截图成功。
