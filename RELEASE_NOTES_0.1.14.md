# v0.1.14 — Cursor Skill MCP-first 重构（2026-11-04）

## Scope

- **重写 Cursor Skill**：默认流程从 499 行的桌面 CLI 教程变成精简的 MCP 协作协议（先判断意图 → 读取现有 XML → 原画布修改 → 真实 PNG 视觉验收）。默认新建只允许用户明确要求新图时触发。讨论建议不自动修改。
- **CLI 教程不删除**：完整原有 CLI 章节原样移动到 `plugins/cursor/skills/drawio/references/desktop-cli-legacy.md`，仅在用户明确要求非 MCP 桌面工作流时选读；不会污染默认 MCP Skill 上下文。
- **统一 XML 指导**：修正 `shared/xml-reference.md` 与 `shared/xml-essentials.md` 里“禁止检查/调整坐标”“禁止所有手工布线”的旧规则。支持必要的出口锚点、控制点修复；优先自动布局/路由，再针对真实 PNG 修复。
- **提升视觉验收硬度**：给出节点大小、对齐容差、间距、折线数量与颜色数量的实用起点；明确线穿框、文本溢出、公式渲染错误等否决项，并要求必须实际打开 `get_snapshot` PNG，不是只拿到路径。
- **简洁通用的数学公式规范**：仅说明合法定界符、XML 转义、节点尺寸、文本与公式排版、自检；不枚举特殊宏、符号或特定公式的渲染缺陷；不保留已经修好的历史禁令。
- **同步工具说明**：`create_diagram`、`update_diagram`、`get_diagram_changes` 和 `get_drawio_reference` 的描述与新 Skill 一致，后者从“每次必读”改为“需要语法参考时按需读取”；修复 `modelContextText` 曾错误建议 Agent 使用 `create_diagram` 修改图的问题。

## Compatibility

- MCP 功能、Viewer、公式、Snapshot、Remote SSH、导出、离线/在线按钮等执行代码 **保持不变**。
- 仅在 Cursor 插件目录改写默认 `SKILL.md`；Claude Code/Codex/Copilot 的桌面 CLI Skills 未改，避免破坏非 Cursor 使用场景。
- 更新包版本为 `0.1.14`；原项目 `vendor/drawio-webapp` 官方资源仍由使用者保留/单独安装。
- 增加 `skill-mcp-first.test.js`，并调整旧测试中依赖“Skill 必须内嵌 CLI 全文”和“必须每次读长参考”的假设。

## Verification (build environment)

- 18 relevant MCP-first, human-edit, model-context and version contract tests: passed.
- Full `node --test test/*.test.js` run: 97 passed, 2 skipped; 4 test modules could not initialize because this isolated build environment lacks existing npm dependencies (`@modelcontextprotocol/sdk`, `pako`). Those are environment setup blockers, not verified passing tests.
- Verified the archived CLI section matches the original v0.1.13 source verbatim; v0.1.14 MCP Skill is 76 lines.
- The real Cursor UI / MCP connection was not exercised in this environment.
