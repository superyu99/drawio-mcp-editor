# v0.1.15 — 标准 .drawio 文件导出修复（2026-11-05）

- 修复 Viewer/MCP 单页 `mxGraphModel` 直接导出为 `.drawio` 导致飞书无法导入的问题。
- 统一服务端 `Save .drawio`、`export_diagram(format=drawio)` 及从外部文件加载后回写的格式：裸 `mxGraphModel` 自动封装为标准 `<mxfile host="app.diagrams.net"><diagram ...>...</diagram></mxfile>`。
- 已有 `mxfile` 原样保存，保留多页、压缩内容、数学标记与其他元信息。
- 继续保留原子写入与导入文件外部更改冲突检测。会话中的 `get_current_diagram` 仍可返回原始模型 XML，不改变 Viewer 协作协议。
- 添加裸模型/完整多页/回写回归测试。

已知范围：未修改 PNG、Snapshot、编辑器 UI；实际飞书导入需在用户环境验证。
