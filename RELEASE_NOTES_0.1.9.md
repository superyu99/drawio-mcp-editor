# v0.1.9 — Editor 保存反馈、工具栏对比度及 Agent 绘图约束

基于 v0.1.8，小范围改动，保留离线/Remote SSH、官方 Viewer/Edit、MathJax、独立 `get_snapshot` 及导出链路。

## 行为修复

- **Finish editing 失败提示：** 原 `Retry finish` 来自 `finishEdit()` 的统一 `catch`，可能是官方 Editor 导出 XML 超时（15 秒）、`save_diagram` 失败（例如保存冲突）、或 MCP 通信异常。之前只使用 `alert()`，嵌入式宿主可能抑制弹窗，用户只能看到 `Retry finish`。现在改为 `Retry save`，把具体错误作为编辑工具栏上的可见文本和 hover 标题显示，保留未保存的 Editor 内容以便排查/重试。没有无依据地延长超时或自动重试；并发修改仍按旧机制拒绝覆盖。
- **工具栏可读性：** 非 Edit 按钮也采用显式的高对比度背景、文字和边框（支持亮/暗主题）；保留 Edit 蓝色强调，但不再让其他按钮在暗色主题下近乎隐形。
- **公式验证误报：** 官方 Editor 的 `formulaCount()` 旧规则对 `$$\\begin{aligned}...\\end{aligned}$$`、`\\(\\begin{cases}...\\end{cases}\\)` 双重计数。现在先统计完整定界公式，再统计独立顶层 `\\begin` 块，使一个公式按一个结果检查。**这不是重写 MathJax**，只是修正截图完成判定；渲染引擎仍完全由官方提供。

## Agent 约束（简洁且避免上下文膨胀）

- **创建边界：** `create_diagram` 工具说明 + Cursor Skill 明确：只有用户明确要求新的画布才允许创建。针对已有图的建议、讨论、优化、反馈，默认同名阅读/修改（`get_current_diagram → update_diagram`），只讨论不请求执行时不得擅自写图。
- **公式：** Skill 补充 `math="1"`、行内/行间定界符、XML 转义、反引号 AsciiMath 冲突、盒内优先短行内公式以及截图检查。对 `\\begin` 的限制不再简单错误归因于 MathJax。
- **审美：** Skill 补充因果完整、时间方向、对齐、紧凑留白、连接线走向、结果框/边标分工、语义色和彩色克制、视觉 QA；工具说明仅增加一行短提示。保留**官方 Skill 的全部原始内容**。

## 测试及部署

- 针对性回归：16 通过，1 因本环境 Chromium 策略跳过。
- 全套源代码测试：79 通过，2 跳过；4 组因本构建环境缺少 `@modelcontextprotocol/sdk` / `pako` npm 依赖未能执行（不是断言失败）。
- 本环境无法实测 Cursor 完整 Editor 和主题，需在使用环境验证。
- 解压更新源码时保留原 `vendor/drawio-webapp/` 官方资源并重启 MCP Server；升级后的新的 MCP App 卡片才会使用新版前端界面。
