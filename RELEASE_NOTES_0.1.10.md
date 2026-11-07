# v0.1.10 — 本机 Viewer 资源与远程 MCP 截图彻底解耦

基于 v0.1.9。**适用于同一台电脑同时使用 Cursor 本地项目和 Remote SSH 项目、远程机器上多个 Cursor 窗口各自启动 `user-drawio` stdio 进程的场景。**

## 改动

- `DRAWIO_VIEWER_EDITOR_URL`（**新增**）：设置 **Cursor 客户端所在机器**的本地官方 Editor 资源 URL。Remote SSH 配置示例：`http://127.0.0.1:41391`。这个 URL **仅**写入 Viewer/MathJax/Edit 的 HTML 和 MCP App CSP，不提供给远程截图器。
- `get_snapshot` 与 `export_diagram(format:"png")` 仍使用 **MCP Server 所在机器**的独立官方 Editor 主机 + headless Chrome。远程实例使用自动分配的回环端口，无论本地 Viewer URL 是多少，都不会访问本地客户端的 41391。
- 同一台远程机上允许同时运行多个 Cursor MCP 实例：启用 `DRAWIO_VIEWER_EDITOR_URL` 后，即使遗留了 `DRAWIO_EDITOR_PORT=41391`，快照主机也使用随机端口；一般情形下若旧固定端口被占用，会退回随机端口而不是杀死 MCP 进程。
- `npm run serve:local-editor` (**新增**)：在**客户端电脑**用随包官方资源启动 **一份**、仅绑定 `127.0.0.1:41391` 的 HTTP 静态资源服务，所有本地和 SSH Cursor 窗口共用。它不连接 MCP、不存储图纸、不执行截图、不需要额外 npm 库，**但必须保持运行**。
- 保持 v0.1.9 的 Viewer/Edit、人机编辑冲突保护、公式处理、界面和绘图 Skill，不修改现有 PNG 渲染逻辑。

## 部署（完全离线、无 SSH 端口转发）

1. **本机电脑上**保留完整官方资源 `mcp-app-server/vendor/drawio-webapp/`，在源码目录执行：
   ```bash
   cd mcp-app-server
   npm run serve:local-editor
   ```
   亦可直接运行 `node mcp-app-server/src/serve-local-editor.js`（不用 `npm ci`，仅需 Node 22+）。应输出 `READY http://127.0.0.1:41391`。
2. **本机浏览器/终端上**验证 `curl -I http://127.0.0.1:41391/math4/es5/drawio-mathjax.min.js` 返回 200；同一地址的 `/?embed=1` 应显示官方 Editor。此时本机资源服务必须继续运行。
3. **远程 MCP** 的 Cursor SSH 服务器配置增加：
   ```json
   {
     "env": {
       "DRAWIO_OFFLINE": "1",
       "DRAWIO_VIEWER_EDITOR_URL": "http://127.0.0.1:41391"
     }
   }
   ```
   删除以前的 `DRAWIO_EDITOR_PORT=41391`，**不必配置任何 SSH 端口转发**。远程机器仍需完整的官方 Editor 资产、原来的 npm 依赖、Node.js 22+ 和供 `get_snapshot` 使用的 Chrome/Chromium。
4. **本机 MCP** 不设置 `DRAWIO_VIEWER_EDITOR_URL`，默认沿用自身随机端口的官方资源；它也可以跟本机共享服务同时运行。
5. 重启所有远程 MCP 进程，创建**新的** Viewer 卡片，验证公式、Edit 和 `get_snapshot`。旧卡片保留旧的资源 URL 和 CSP，不会自动修复。

## 安全、限制与排查

- **完全离线运行**：两台机器分别读取自己预装的官方资源；不请求互联网。`127.0.0.1` 始终是各自机器的回环地址。HTTP 服务不监听公网网卡。
- `DRAWIO_VIEWER_EDITOR_URL` 必须是无路径、带端口的 `http://127.0.0.1:<port>` / `http://localhost:<port>`；公网地址会被拒绝。
- 本机 41391 只运行 **一份**静态服务。如果端口已有监听者，先核验它是否为本项目的官方服务，不要强行杀死未知进程；可使用 `DRAWIO_LOCAL_EDITOR_PORT` 指定另一固定端口，并同步更新远程 MCP 的 Viewer URL。
- 客户端静态服务进程退出后，远程截图仍可工作，但 Viewer 数学公式和 Edit 会无法加载。这个版本没有在远程端自动启动本机进程，也没有偷偷建立网络隧道。
- 本源码 ZIP 与早前版本相同，**不包括完整官方 `vendor/drawio-webapp` 文件**。离线部署时需要从原安装复制到本地及远程各自目录；不能靠运行时下载。
- 脚本和单元测试可以在当前环境验证；Cursor Remote SSH 的 MCP App CSP / Webview / Editor 真实交互仍须实机验收。实验前保存原 v0.1.9 以便回退。
