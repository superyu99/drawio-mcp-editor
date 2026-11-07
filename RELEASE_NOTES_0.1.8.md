# v0.1.8 — 默认离线 + Remote SSH 本地 Viewer 资源修复

基于 v0.1.7；保留官方 Editor 渲染与数学公式处理，不自造渲染器，也不新增 MCP Server。

- **Node MCP 默认离线**：`DRAWIO_OFFLINE=1`（不需要显式配置）。随包官方 `vendor/drawio-webapp/` 中读取并内嵌 Viewer、ELK、Mermaid、libavoid 脚本到 MCP App 资源；不再依赖 `viewer.diagrams.net` CDN。
- **严格失败，不回退 CDN**：官方静态包缺少任何必需 JS 文件时直接报 `DRAWIO_OFFLINE: missing ...`，提示提前补齐资源；MathJax 没有 Editor 静态资源时也不回退远程站点。
- **停止公共网络调用**：默认禁用 libavoid CDN ETag 探测及周期检查，禁用在线 icon search，MCP App CSP 中删除公网资源域名。
- **Remote SSH 支持固定 Editor 端口**：`DRAWIO_EDITOR_PORT=41391`；仍只监听远端 `127.0.0.1`。本机通过已有 SSH 通道转发相同端口即可加载 MathJax 与 Editor iframe，不需互联网、不需公网开放监听端口。
- **截图保持不变**：`get_snapshot` / PNG 导出始终在 MCP 所在机器通过本地官方 Editor + 无头 Chrome 执行；无需 Viewer 展开或本机端口转发。

## 远程部署示例

远程 Cursor MCP `env` 中设置：

```json
{"DRAWIO_OFFLINE":"1","DRAWIO_EDITOR_PORT":"41391"}
```

然后在**本地电脑**执行（替换 SSH 主机）：

```bash
ssh -N -L 127.0.0.1:41391:127.0.0.1:41391 user@remote-host
```

本地测试 `curl -I http://127.0.0.1:41391/math4/es5/drawio-mathjax.min.js` 应返回 200。Windows PowerShell 也支持 `ssh -L`。如果 Cursor Ports 已自动转发此端口，不需要再开第二个 SSH 隧道。

## 安装 / 验收

- 完整官方 Editor webapp 静态文件须预先在可联网的构建机打包再拷贝到远程。**源码 ZIP 不包含完整官方 Editor 资源**；保留既有 `vendor/drawio-webapp/`，或配置 `DRAWIO_EDITOR_DIR`。Node npm 依赖也需预先安装或离线打包。
- 确认 `js/viewer-static.min.js`、`js/elk/drawio-elk.min.js`、`js/mermaid/drawio-mermaid.min.js`、`js/libavoid-js/libavoid.min.js`、`js/libavoid-js/libavoid-routing.js` 和 `math4/es5/drawio-mathjax.min.js` 已就绪。
- 测试本机无外网、远程无外网下 Viewer、公式、Edit 和 `get_snapshot`；外部图片 URL / 网页字体不属于静态官方资源，需要内嵌为 data URI 或本地素材。
- 可显式设置 `DRAWIO_OFFLINE=0` 恢复 v0.1.7 的公共 CDN 资源行为，供非受限环境调试，不推荐生产使用。

**测试限制：** 本环境缺少真实打包的官方 webapp 与项目 npm 依赖，故只能执行无依赖的单元/代码检查，远程 Cursor iframe、静态 JS 全链路及完整公式截图仍需用户环境验收。
