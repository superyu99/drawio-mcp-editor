# v0.1.12 — 修复外部浏览器打开官方 Editor（Offline First）

基于 v0.1.11 的最小功能修复。保留 Viewer 内 Edit、人工改图、官方 `get_snapshot`、导出路径布局、SSH 远程资源分离，不增加新服务或公网依赖。

## 问题

- `Open in draw.io` 按钮仍硬编码生成 `https://app.diagrams.net/#create=...`，与 v0.1.8+ 的默认离线要求不一致。企业网络阻断互联网时，用户点击后看起来没有反应。
- 按钮只有 `if(drawioEditUrl) app.openLink(...)`，既不报告 URL 不可用，也不处理 MCP Host 拒绝打开或忽略外链的情况。

## 修复

1. 该按钮从 Viewer 已经采用的 `window.DRAWIO_BASE_URL` 生成地址。**本地 Cursor** 用本机 MCP Editor 资源服务的回环端口；**远程 SSH Cursor** 用 `DRAWIO_VIEWER_EDITOR_URL` 指定的客户端 Editor 服务（例如 `http://127.0.0.1:41391`）；在显式启用在线 Worker 模式时仍可使用在线地址。
2. 本机 Editor 地址使用官方 `?offline=1&pv=0&grid=0#create=...` 协议，沿用既有的压缩 XML 与 pop 效果，浏览器实际打开的是**随包分发的官方 Editor**，不需要访问 `app.diagrams.net`。
3. 点击仍首先调用 MCP App 原有 `app.openLink({url})` 请求 Cursor 打开系统浏览器；**不擅自使用被沙箱禁止的 `window.open()`**。
4. 不管宿主有没有实际弹窗，在 Viewer 的工具栏上方提供可手动打开的链接、可选中的完整 URL 和 `Copy URL` 按钮。链接缺失、宿主报告错误时直接显示原因，不再静默无响应。
5. 新增离线链接回归测试；同步更新原有 `links.test.js` 中的在线地址断言（仅更改 Viewer 按钮，非 UI 客户端的原有在线 fallback 未改变）。

## 使用

- 本地：确认本地 MCP Server 的官方 Editor 资源存在即可，端口由其自动启动。
- Remote SSH：确保**客户端本机**已经运行 `node mcp-app-server/src/serve-local-editor.js`（默认 41391），远程 MCP 的 `DRAWIO_VIEWER_EDITOR_URL=http://127.0.0.1:41391`，不需要转发远程 MCP 的随机端口。
- 重启 MCP Server，生成**新的 Viewer 卡片**。点击 `Open in draw.io`，应尝试用系统浏览器打开本机的官方 Editor。如果 Cursor 对 localhost 链接拒绝弹窗，可使用工具栏上方的 `Copy URL`，手动粘贴到本机浏览器。

**注意**：外部浏览器通过压缩 XML URL 打开的是独立编辑副本，不与 MCP 当前内存图自动双向同步。要将外部修改写回 MCP，请先在浏览器保存 `.drawio`，再通过 `load_diagram` 导入。若需要提交修改到同一会话画布，继续使用卡片内的 `Edit` / `Finish editing`。

## 验证边界

- Node.js 语法检查和离线 URL 构造/解压回归可以在当前环境运行。
- 真实 Cursor MCP App 是否允许自动打开 localhost，由 Cursor Host 策略决定；无法在当前环境模拟最终的宿主 UI 行为，因此提供可手动复制的可靠回退入口。
