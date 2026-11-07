
## Cursor Remote SSH — offline Viewer/Edit + remote snapshots (v0.1.10)

The Cursor MCP App **Viewer runs on the client computer**, while a Remote SSH
`user-drawio` MCP server and its headless PNG renderer run on the **remote** host.
Do not reuse the remote renderer's `127.0.0.1:<random>` URL for Viewer MathJax
or Edit. No SSH port forwarding is necessary with this setup:

- On the **client computer**, install/preserve the complete official
  `mcp-app-server/vendor/drawio-webapp/` assets and run
  `node mcp-app-server/src/serve-local-editor.js` (one process, long-running).
  By default it serves `http://127.0.0.1:41391` on client loopback.
- On the **remote Cursor MCP**, use `DRAWIO_OFFLINE=1` and
  `DRAWIO_VIEWER_EDITOR_URL=http://127.0.0.1:41391`; remove any legacy
  `DRAWIO_EDITOR_PORT=41391`. The remote renderer keeps its own ephemeral port.
- The client asset host contains no diagrams and is **not a second MCP server**.
  Client Viewer/MathJax/Edit read local assets; remote `get_snapshot` stays remote.
- A new Viewer card must be created after changing the MCP configuration.

See `RELEASE_NOTES_0.1.10.md` for commands, port conflicts and offline deployment.

# drawio-mcp-editor-snapshot

**当前版本：v0.1.5** · 基于 [jgraph/drawio-mcp](https://github.com/jgraph/drawio-mcp) 的本地增强版。

面向 **Cursor + 本地 stdio MCP**：Agent 在聊天中绘图、按英文语义名称管理多张画布、按需获取真实渲染截图，并可在嵌入式 draw.io Editor 中人工修改。修改保留官方 MCP 的工具与图形生成功能；这里是非官方分支，未经 draw.io 官方支持。

> **重要：本仓库源码包与完整离线发行包不同。** 如果 `mcp-app-server/vendor/drawio-webapp/index.html` 不存在，编辑按钮无法打开完整 Editor。请在有网络的机器上运行 `scripts/bundle-editor.sh`，把官方完整 Web Editor 固定版本资源打包进去。不要仅复制 `app.min.js`。

## 版本记录

| 版本 | 变更摘要 |
|---|---|
| **0.0.1** | 基于官方 MCP App 加入实验性内嵌 Editor、人工编辑保存与 Agent 读取最新画布、Snapshot 桥接；修复自定义工具注册的 `_meta.ui` 问题。 |
| **0.0.2** | 高亮 `Edit` / `Finish editing`，移除手动 Snapshot 按钮；`get_snapshot` 每次调用即时生成独立 UUID PNG，失败不返回历史结果。 |
| **0.0.3** | 提供内置官方完整 draw.io Web Editor 的资源加载方式和固定上游版本的打包脚本；不再依赖 IDE 扩展资源自动探测。 |
| **0.0.4** | 隔离多个 stdio 实例及多画布的临时 XML/截图状态；加入 `list_diagrams`，防止不明确画布时误截图；改善本地 Editor HTTP 服务的生命周期。 |
| **0.0.5** | 语义化英文画布名称作为 `name`/ID；创建即注册，重名分配 `-2` 等后缀，读图与截图按名称定位；不同进程独立命名空间。 |
| **0.0.6** | 完整保留官方 Cursor Skill 原文，仅补充本地增强协议；重写安装/升级说明；增加 stdio 进程身份日志（版本、PID、PPID、实例 UUID、启动入口及 Editor 状态），便于多 Cursor 窗口排查。 |
| **0.0.7** | 修复 `get_snapshot` 的无效 `[object Event]` 错误信息、首次尚未激活时的竞态；新增无需 Clipboard 的 PNG/.drawio 导出；编辑提交后刷新 Viewer，重新打开时优先读取保存的当前 XML；删除画布 revision，仅保留每个名称唯一的当前文件。 |
| **0.0.8** | 人工每次 Finish editing 独立记录一条增删改结构事件；新增 `get_diagram_changes` 逐次读取（不合并、不清空）、`update_diagram` 原名更新、Viewer 自动读取最新内容；保存成功后发送简要变更通知，禁止过期的人工编辑覆盖 Agent 更新。 |
| **0.0.9** | 修正官方 `Graph.getSvg(background,scale,border,nocrop)` 参数顺序导致的异常 300×150 PNG；对 SVG 显式尺寸与内容边界、PNG 实际 IHDR 尺寸双重校验；导出失败不生成误导性图片；同步约束 Agent 不使用其他工具擅自绕过截图失败。 |
| **0.1.0** | Local Export：工具栏 PNG/Save .drawio 直接写本地持久目录，原位置反馈真实绝对路径和错误；支持 `DRAWIO_EXPORT_DIR`；Agent 新增 `export_diagram`；保留按需 UUID `get_snapshot`；去掉新导出按钮的宿主下载与 `alert()` 依赖。 |
| **0.1.1** | Math Rendering：恢复独立 Viewer 的 `math="1"` 状态及 TeX 识别，流式更新后按需加载 MathJax（有完整 Editor 时走本地地址）；公式排版与截图/PNG 导出共享等待流程，未正确渲染则明确失败而不返回缺失公式的图片；增加本地公式测试。 |
| **0.1.2** | Load Diagram：新增 `load_diagram(path)`，以绝对路径导入用户已保存的 `.drawio`，自动生成当前会话内新画布并恢复完整 Viewer/Edit/Agent 协作。保留原始多页/公式数据；工具结果只返回名称与路径，Viewer 再通过 `get_current_diagram` 读取 XML。导入不修改原文件，只有用户明确点击 Save .drawio 或调用 `export_diagram(format:"drawio")` 才写回源路径；检测源文件外部修改，禁止静默覆盖；不添加数据库和历史版本。 |
| **0.1.3** | Export Path Response：修复 PNG / Save .drawio 按钮的 MCP 响应解析；兼容结构化数据、文本与嵌套结果，仅在得到绝对路径后提示成功，否则显示诊断响应。Server 文件保存、Viewer、Editor、公式及 Load Diagram 行为不变。 |
| **0.1.4** | Snapshot Reliability：按需截图默认最长等待 90 秒、领取期限 25 秒、活跃心跳 15 秒；新增 Viewer 截图阶段回报与 stderr 日志，失败返回 JSON 诊断（阶段、时长、领取状态、时间线、重试建议），成功仍只返回即时生成的随机 PNG 路径。 |
| **0.1.5** | Official Editor Snapshot：Agent PNG 由现有 MCP Server 读取 XML、调用本地官方 Editor 的导出协议完成，不依赖 Viewer 是否展开；移除截图轮询/心跳；按需调用系统 Chrome/Edge/Chromium 的隔离无头实例。 |
每个版本的详细记录在 `RELEASE_NOTES_0.0.x.md` / `RELEASE_NOTES_0.1.x.md` 中（早期版本以仓库中已有的 release notes 为准）。


## v0.1.5：官方 Editor 独立截图（实验版）

`get_snapshot({name:"grpo-training"})` 直接读取 MCP Server 中最新保存的 XML，让官方 draw.io Editor 按官方 `action:"export",format:"png"` 协议生成完整 PNG，校验后返回新的绝对路径，例如 `/tmp/drawio-<uuid>.png`。

**不要求 Cursor 聊天中的 Viewer 被展开或持续运行**。已经删除 `poll_snapshot`、`snapshot_progress`、`submit_snapshot` 和 `SnapshotBridge` 运行链路，`list_diagrams()` 只报告持有的图形名称与文件位置。

**执行环境**：MCP Server 本身继续使用 Node.js；官方 Editor 的 Canvas 代码需在网页运行环境中执行，因此本模块按需调用系统已安装的 Chrome/Edge/Chromium，使用 Node.js 22 内置 WebSocket 控制隔离的无头浏览器。不是新 MCP Server，也没有新增 Puppeteer/Playwright npm 依赖。必要时配置 `DRAWIO_BROWSER_PATH` 为浏览器可执行文件的绝对路径；超时 `DRAWIO_OFFICIAL_EXPORT_TIMEOUT_MS` 默认 60000。

**实机验证**：当前提供的是供验收的源码版本。本环境没有官方完整 Editor 文件，并且 Chromium 被管理员策略禁止打开所有网页（包括本机地址），因此官方 Editor 的真实 PNG 输出尚未端到端确认。模拟消息协议、PNG 校验及源码单元测试已覆盖；部署时必须用实际 GRPO/Transformer 图验证 MathJax、标签、连线及边界。详见 [`RELEASE_NOTES_0.1.5.md`](RELEASE_NOTES_0.1.5.md)。

## v0.1.2：通过绝对路径恢复已有画布

适用场景：通常一次打开 Cursor 就完成绘图；只有之后确实想继续修改时，才显式恢复，无自动恢复、没有数据库和跨 Chat 注册表。

1. 先确认文件确实存在于 **MCP Server 所在机器**，例如：`/home/aron/drawio-exports/transformer-architecture.drawio`。
2. 在当前或历史 Chat 直接告诉 Agent：“请加载这个文件并继续修改”，Agent 调用：

   ```json
   {"path":"/home/aron/drawio-exports/transformer-architecture.drawio"}
   ```

   工具名为 **`load_diagram`**。必须使用绝对路径和 `.drawio` 后缀，文件不能超过 5 MB。Agent 无需把完整 XML 复制进 `create_diagram`。
3. 工具返回加载后的**语义名称**（从文件名生成；同名加 `-2/-3`）和原文件路径。Cursor 在该工具结果下方生成**新的可交互 Viewer**，而不是试图唤醒旧的、绑定旧 MCP 进程的卡片。
4. 恢复后正常使用 `get_current_diagram(name)`、`get_snapshot(name)`、`update_diagram(name,xml)` 和 **Edit → Finish editing**。后者只提交到当前会话工作副本，不会自动改写原文件。
5. **明确点击 Save .drawio** 或让 Agent 调用 `export_diagram({name,format:"drawio"})`，才会将当前完整文档写回**原来的绝对路径**。如果别的进程或软件已改过原文件，则拒绝覆盖并给出错误；可自行另存新文件重新加载。PNG 导出仍写到 `DRAWIO_EXPORT_DIR`。

**文档保真：** 加载时不执行 XML 重排、修复、格式化或压缩转换；保留完整 `.drawio` 原始内容，Viewer 只展示首页，官方 Editor 仍处理整个多页文档。恢复动作不会保留过去会话的人工修改事件日志；新的人工修改在新会话内从零开始记录。用户主动保存的 `.drawio` 是恢复的唯一来源，请在关闭 Cursor 前显式导出。


## 1. 首次安装（Ubuntu / Cursor）

前置条件：Node.js（推荐 22+，以实际依赖兼容性为准）、npm、Python 3、Cursor 2.6+（在聊天中显示 MCP Apps）、必要时 Git。**本地 MCP 不需要手动执行 `npm start`**，Cursor 启动时负责创建 stdio 进程。

### 1.1 安装服务依赖

把 ZIP 解压到固定位置，例如 `~/tools/drawio-mcp-main`，然后在 Cursor 终端执行：

```bash
cd ~/tools/drawio-mcp-main/mcp-app-server
npm ci --omit=dev
```

确认入口绝对路径：

```bash
realpath src/index.js
```

### 1.2 安装完整 Editor 资源（只有源码包时需要）

有网络的机器在仓库根目录执行：

```bash
cd ~/tools/drawio-mcp-main
bash scripts/bundle-editor.sh
```

脚本从官方 `jgraph/drawio` 固定提交检出完整 `src/main/webapp`，放入 `mcp-app-server/vendor/drawio-webapp/`，并输出新的 `drawio-mcp-editor-snapshot-0.1.5.zip`。**这个新生成的 ZIP 才是包含完整 Editor 的可分发包。** 不需要额外的 `hediet.vscode-drawio` 扩展。若公司网络不允许下载，请在获得授权的联网机器上打包，再将资源带入内网。

验证核心文件：

```bash
ls mcp-app-server/vendor/drawio-webapp/{index.html,js/app.min.js}
```

**v0.1.1+ 公式渲染还要求官方 Editor 的 MathJax 资源完整存在：**

```bash
ls mcp-app-server/vendor/drawio-webapp/math4/es5/drawio-mathjax.min.js
```

自定义 `DRAWIO_EDITOR_DIR` 时也需要这份资源。没有本地 Editor 时 Viewer 会尝试 `https://viewer.diagrams.net/math4/es5/`，但可能受到公司网络或 Cursor CSP 限制。

### 1.3 配置 Cursor 本地 stdio MCP

在 Cursor 的 `~/.cursor/mcp.json`（全局）或项目内 `.cursor/mcp.json` 添加，**只保留一个同名 `drawio` MCP**：

```json
{
  "mcpServers": {
    "drawio": {
      "command": "node",
      "args": ["/home/aron/tools/drawio-mcp-main/mcp-app-server/src/index.js", "--stdio"],
      "env": { "DRAWIO_ICON_SERVICE_URL": "off", "DRAWIO_EXPORT_DIR": "/home/aron/drawio-exports" }
    }
  }
}
```

将 `/home/aron/...` 改成上一步 `realpath` 的输出。若你已使用本地插件 `~/.cursor/plugins/local/drawio/mcp.json` 注册了同名服务，**请在那里改为上述 stdio 配置，或禁用该文件的 MCP 配置**，以免官方默认托管地址 `https://mcp.draw.io/mcp` 和本地服务同时存在。`DRAWIO_EDITOR_DIR` 不必配置；本地服务优先读取随包提供的 Editor。

最后在 Cursor 执行 **Developer: Reload Window**；如果旧 MCP 进程持续存在，请完全退出 Cursor 再启动。打开 **Cursor Settings → Tools & MCP** 确认 drawio Connected。

### 1.4 安装修改后的官方 Skill

完整 Skill 随源码交付，路径为：

`plugins/cursor/skills/drawio/SKILL.md`

**保留官方完整 Skill 内容**，只添加增强版工具协议。你可以将它安装为 Cursor 用户级 Skill：

```bash
mkdir -p ~/.cursor/skills/drawio
cp ~/tools/drawio-mcp-main/plugins/cursor/skills/drawio/SKILL.md ~/.cursor/skills/drawio/SKILL.md
```

如果你已经通过本地 Cursor Plugin 安装 Skill（`~/.cursor/plugins/local/drawio/skills/drawio/SKILL.md`），请**直接覆盖现有 Skill**，而不是同时保留两份：

```bash
cp ~/tools/drawio-mcp-main/plugins/cursor/skills/drawio/SKILL.md ~/.cursor/plugins/local/drawio/skills/drawio/SKILL.md
```

两种安装位置二选一，避免同名 Skill 冲突。重载 Cursor 后在 Customize → Skills 确认出现 `drawio`。原版 Skill 中的 Mermaid、XML、CLI 和导出指导全部保留。

## 2. 从旧版本升级

1. 先备份旧仓库目录及自定义配置，**关闭所有 Cursor 窗口**。
2. 解压新版 ZIP 并覆盖同名 `drawio-mcp-main` 源码目录；保留原有 `node_modules` 与已经构建的 `vendor/drawio-webapp`。
3. 在 `mcp-app-server` 执行 `npm ci --omit=dev`（如依赖版本有变化，或者本机依赖不完整）。
4. 按 **1.4** 覆盖**你实际加载的 Skill**，而不是只更新仓库里的 Skill 文件。
5. 检查 stdio 配置指向新版 `src/index.js`；完全退出并重新打开 Cursor。已有历史 Chat 的旧 UI 实例不一定会更新，应在**新 Chat** 中测试新工具。

若 ZIP 内没有完整 Editor 资源，请按 **1.2** 重新打包；不要删除已经正常工作的 Editor 静态资源目录。

## 3. 日常使用

在 Cursor Chat 中让 Agent：

> 使用 drawio MCP 创建名为 `scene-query-flow` 的 Scene Query 数据流架构图，绘制完成后调用 `get_snapshot(name="scene-query-flow")`，打开返回的 PNG 检查布局。

- `load_diagram({path})`：从已有 `.drawio` 绝对路径显式恢复新 Viewer；重启后不自动恢复。加载后用新的 `name` 继续与 Agent 协作，明确点击 Save .drawio 时才写回原始文件。
- `create_diagram({name, xml|mermaid})`：`name` 为英文 kebab-case 唯一标识；重名会分配 `-2`、`-3` 等名称。**后续必须使用工具返回的最终名称**。
- `list_diagrams()`：列举当前 MCP 进程的具名画布。
- `get_current_diagram({name})`：读取唯一当前 XML；人工结束编辑后应先读取最新内容。
- `get_diagram_changes({name})`：返回每次人工 Finish editing 保存后形成的独立事件（added/removed/modified）；**多次保存按次列出，不合并、不清空**。只保存事件摘要，不保留历史 XML。
- `update_diagram({name,xml})`：Agent 覆盖指定名称的当前文件，原 Viewer 会刷新；不要使用 `create_diagram` 更新旧图。
- `get_snapshot({name})`：每次调用均从本进程最新 XML 通过官方 Editor 独立导出全图 PNG，返回全新随机绝对路径。无需展开 Viewer；失败返回 JSON 诊断。需要本机 Chrome/Edge/Chromium（可配置 `DRAWIO_BROWSER_PATH`）。
- **Edit → Finish editing**：进入完整 Editor、人工拖拽和修改，结束时提交修改后的 XML。此功能要求本地 Editor 静态资源及 Cursor iframe 兼容。编辑期间不反复提交完整 XML。

同一 MCP 进程中有多张画布时，使用明确的 `name`；不允许随意选择“最近使用”的画布。不同 MCP 进程有独立的命名空间与临时文件。**这里不提供跨窗口同步编辑同一画布的能力**。

## 4. 多窗口排障：确认版本及 PID

v0.1.5 会将带 `[drawio-mcp]` 前缀的结构化 JSON 日志写入 **stderr**，不会污染 stdio JSON-RPC 的 stdout。例如：

```text
[drawio-mcp] {"event":"start","version":"0.1.5","instance":"...","pid":12345,"ppid":1234,"mode":"stdio","entry":"/home/aron/tools/drawio-mcp-main/mcp-app-server/src/index.js","buildId":"...","node":"v22.0.0","exec":"/usr/bin/node","at":"..."}
[drawio-mcp] {"event":"ready","version":"0.1.5","instance":"...","pid":12345,"ppid":1234,"mode":"stdio","entry":"...","buildId":"...","editor":"available","editorUrl":"http://127.0.0.1:...","at":"..."}
```

`version` 确认源码版本；`pid` / `ppid` 和 `instance` 区分 MCP 实例；`entry` 判断 Cursor 是否加载了其他路径的旧包；`editor` 判断 Editor 资源是否就绪。收到终止信号或退出时还会打印 `signal` / `exit` 日志。**注意 Cursor 可能通过 Shared MCP process 在多个窗口共用同一个进程，所以这些字段标识的是 MCP 实例，不是 Cursor 窗口或 Chat ID**；除非宿主明确提供窗口标识，不能凭空生成可信的窗口 ID。

在 Cursor 的 MCP Output 中检索 `[drawio-mcp]` 即可；如果只看到旧日志却没有 `event=start`，优先检查 Cursor 的 MCP 启动路径和旧进程是否仍存在。

## 5. 验证与限制

```bash
cd ~/tools/drawio-mcp-main/mcp-app-server
node --test test/runtime-identity.test.js
npm test
```

- `get_snapshot` 已修复 0.0.8 中 `getSvg` 参数顺序错误造成的 300×150 PNG。校验可以防止明显的裁切/默认尺寸被误报为成功，但完整 Cursor 沙箱端到端截图仍需实机确认。
- `get_snapshot` **不依赖内嵌画布的活跃状态**；依赖完整官方 Editor 资源与本机可运行的受支持浏览器。失败时必须明确报错。
- Editor 静态资源打包后，仍需在具体 Cursor 版本验证 iframe/CSP 与 postMessage 通信兼容性。
- 本地 stdio MCP 不会将 XML 主动发送给托管 draw.io MCP；但 Cursor 的云端模型本身是否接收提示词和内容取决于模型/客户端配置。默认 Viewer 等可选资源仍可能使用 CDN，严格离线需单独验证网络出口。
- 当前画布注册记录只在 MCP 进程生命周期内有效；进程重启不会自动恢复注册表。不能把 `/tmp` 当作永久存储。
- 这不是官方 `jgraph/drawio-mcp` 的稳定版；原始说明保留在各子目录，官方项目：https://github.com/jgraph/drawio-mcp 。

## 6. 上游版权

增强版保留官方项目许可与说明。所内置的完整 Editor 来自 [jgraph/drawio](https://github.com/jgraph/drawio) 的固定修订，打包脚本会连同许可证和上游版本标识保存在 `vendor/drawio-webapp/` 中。不得将未经下载完整静态资源的源码包宣传为完整离线 Editor 发行包。

## 5. 当前文件、导出与截图排障

- **单份当前内容：** 每个 `name` 只有一个 `.drawio` 文件，`Finish editing` 会原子覆盖该文件。`list_diagrams` 不再返回 revision。为了避免覆盖旧版，在重新打开聊天内画布时会从本 MCP 进程的本地存储中读取当前 XML；不重放过时的首次绘图内容。
- **限制：** MCP 进程目录仍位于 `/tmp`；重启 Cursor/MCP 进程后原始聊天的画布与旧临时文件不能保证恢复。需要持久保存时点击 **Save .drawio** 导出至持久目录。不同进程仍隔离，同名不会跨进程共享。
- **PNG 导出：** 点击 **PNG** 会在 MCP Server 本机直接渲染整张图并原子覆盖 `~/drawio-exports/<name>.png`，画布下方会显示实际绝对路径或错误；不使用浏览器下载、剪贴板或弹窗。失败不创建误导性 PNG。
- **draw.io 导出：** 对于新建图，点击 **Save .drawio** 从 MCP Server 的**唯一当前 XML** 生成 `~/drawio-exports/<name>.drawio`；对通过 `load_diagram` 恢复的图，明确保存时写回原始源文件路径（并检测外部修改）。原子覆盖，结果显示在画布下方；不会把过时的初始内容写出去。
- **导出目录：** 默认 `~/drawio-exports`（这里 `~` 是 **MCP 服务运行账号的 HOME**，不是 Cursor 聊天窗口目录）。可在 stdio MCP 配置的 `env` 中加入 `"DRAWIO_EXPORT_DIR": "/home/aron/diagrams"`，也支持 `~/diagrams`。目录自动创建。同名文件重复导出会覆盖；**不同 Cursor/MCP 进程若导出同名图到同一公共目录，最后一次导出覆盖前一份**，需要隔离时给各进程配置不同目录。
- **Agent 导出：** `export_diagram({name,format:"png"|"drawio"})` 在服务端保存并返回持久路径；PNG 必须等待具名画布回应即时渲染，关闭时会超时报错；`.drawio` 直接从最新 XML 落盘。Agent 自主目视检查仍请用 `get_snapshot`（随机临时路径）。
- **v0.1.3 导出按钮兼容性：** 前端接受标准 MCP Tool Result、JSON 文本结果及被宿主嵌套包装的结果；只有解析出绝对路径才显示 Saved。若仍失败，错误区将附带最多 500 字符的 MCP 响应摘要以便诊断。按钮不使用浏览器下载和 Clipboard，也不会由前端猜测输出路径。
- **Agent 截图：** `get_snapshot(name)` 每次通过独立的官方 Editor 实例从当前 XML 生成新 PNG，仅返回随机绝对路径；若系统浏览器、Editor 资源或公式导出不可用，明确返回错误，不返回旧图片。
- **不能保证的能力：** 如果 Cursor 完全暂停/卸载了嵌入画布，MCP 服务端无法凭空截取那个页面。此时工具等待至超时并给出打开画布的提示；真正无 UI 的截图需要独立本地渲染器，不属于本版。

安装：按第 1、2 节升级。保持 stdio `args` 指向实际解压目录。源码 ZIP 不含完整官方 Editor 资源；要内置 Editor 需运行 `bash scripts/bundle-editor.sh`。

## 6. 人工改图与 Agent 协作（v0.0.8 起）

人工点击 **Edit** 后在官方 Editor 内自由修改；只有点击 **Finish editing** 且内容确实变化时，才发生一次提交：原 `.drawio` 文件被覆盖，同时以 JSONL 追加一条独立的结构化改动事件。Agent 可以调用 `get_diagram_changes(name)` 一次获取**所有人工提交事件**；读取不清空，也不会将多次保存折叠为最终差异。每次事件包含 `id`、`at`、`name`、`changes.added`、`changes.removed`、`changes.modified`。若只是格式化 XML 而节点属性未变化，事件的增删改数组可能为空；解析失败会显式记录 `warning`。

差异依据 draw.io `mxCell` 稳定 ID，比较标签、节点位置/尺寸、样式、父子关系、连接端点与几何控制点；支持普通 `mxGraphModel`、`mxfile` 的未压缩或压缩页面、`object` 包裹节点。**不是对原始 XML 的行级 diff**，因此不会把格式、属性顺序或完整 XML 反复交给模型。对不属于这些字段的高级 draw.io 数据，可能只提示无法细分，Agent 需要时仍可读取最新 XML。

Editor 提交成功后，如宿主支持 `app.updateModelContext`，会发送本次精简改动摘要（超长时仅提示调用 `get_diagram_changes`）。可靠数据来源仍是本地保存文件和事件日志。Agent 调用 `update_diagram` 时不会产生“人工改动”事件；前端 Viewer 定期查询是否需要刷新。若人工编辑期间 Agent 修改了同名文件，人工的过期提交会拒绝覆盖并提示重新加载。

**仅保留一份当前图形文件**；`.changes.jsonl` 是单独的轻量事件记忆，不存每次历史图形。它与图形注册表同属当前 stdio 进程的临时目录，重启后不承诺恢复；请通过 **Save .drawio** 永久保存正式图纸。
