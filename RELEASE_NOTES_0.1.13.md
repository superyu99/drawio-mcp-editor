# v0.1.13 — 恢复可选在线官方编辑器入口（2026-10-28）

基于 v0.1.12 的最小修正：用户明确区分了 **自动运行的核心能力必须离线** 与 **手动点击的外部在线功能允许联网**。

- **Open in draw.io**：恢复指向 `https://app.diagrams.net/?pv=0&grid=0#create=...`。在本机/Remote SSH 下行为一致。链接含压缩 XML，保持原有 pop 效果；仅主动点击后请求 Cursor 打开公网网站。生成 URL 不产生网络请求。
- **Edit**：仍使用本机打包的官方 Editor 资源，继续离线，支持同步编辑。
- **Viewer / MathJax / get_snapshot / Save .drawio / PNG**：保持本地/远程离线实现不变，仍使用原本的客户端/服务端资源分离架构。
- **打开失败兜底**：保留 v0.1.12 的可复制完整 URL 和错误提示；不允许点击失败时静默无响应。
- 外部在线编辑会打开**独立副本**，不自动同步到 MCP 会话。如果要将修改写回，下载 `.drawio` 再用 `load_diagram` 导入。

不修改已稳定的截图、公式、Edit、导出和端口管理代码。只修改按钮链接构造、对应提示、测试与版本号。

## 验证

- `node --test mcp-app-server/test/offline-external-editor-link.test.js`：检查 `app.diagrams.net`、压缩 XML 还原及主动点击回退逻辑。
- `node --test mcp-app-server/test/links.test.js`：要求已安装 npm 依赖。
- 需要在 Cursor 生成一张**新 Viewer 卡片**后点击按钮确认浏览器行为。无需在离线环境点击此按钮。
