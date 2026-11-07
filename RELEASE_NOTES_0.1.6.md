# v0.1.6 — 修复官方 Editor 截图导出挂起（2026-10-19）

以 **v0.1.5** 为基础的热修复版。

## 核心修复

- 修复 `mcp-app-server/src/editor-host.js` 中官方截图宿主页面发送给 draw.io Editor 的 `postMessage` payload。
- 删除错误字段 `spin:false`。该字段会触发官方 `EditorUi.js` 中的 spinner 分支，使 `action:"export"` 的整段导出逻辑被静默跳过，表现为 `get_snapshot` / PNG 导出长时间挂起直至超时。
- 修复后，官方 Editor 的 `init -> export -> data:image/png;base64,...` 回传链路可以正常完成，`get_snapshot` 与 `export_diagram(format:"png")` 不再因为这处 payload 错误而无响应。

## 保持不变

- 仍然使用 **现有 MCP Server** + **源码包内的官方 draw.io Editor 资源**。
- 不自己实现图形渲染，不恢复 Viewer 轮询截图，不依赖 `activeNames`。
- 仍然按需使用本机已有 Chrome / Edge / Chromium 作为隐藏运行环境；不新增第二个 MCP Server，也不引入 Puppeteer / Playwright。

## 影响范围

- `get_snapshot({name})`
- `export_diagram({name, format:"png"})`
- 官方截图宿主页 `__drawio_snapshot__.html`

## 回归

- 更新 `official-snapshot` 相关测试，确保导出 payload 不再包含 `spin:false`。
- 更新版本号到 `0.1.6`。
