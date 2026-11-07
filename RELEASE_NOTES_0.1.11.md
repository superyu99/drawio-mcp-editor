# v0.1.11 — 修复 PNG / Save .drawio 导出路径被卡片底部裁切

基于 v0.1.10 的最小 Viewer 布局修复。不修改远程资源分离、官方 Editor、公式、PNG 渲染、Agent 工具协议、XML 保存逻辑。

## 修复

- 之前 `showExportStatus()` 仅调用 `notifySize()`，但没有从图形区域的高度预算中扣除后来出现的路径提示。高图已经顶满 Cursor MCP App 内联高度上限时，提示新增到工具栏下方，被宿主卡片边缘截断。
- 将 `#export-status` 调整到 **工具栏正上方**；保持完整绝对路径可复制、长路径自动折行，错误信息同样可见。
- `measureChrome()` 现在计入提示条自身高度及外边距。`showExportStatus()` 先调用 `resizeContainerToFit()` 为提示腾出空间，再 `notifySize()` 更新宿主尺寸。
- `notifySize()` 兼顾提示和工具栏的真实 DOM 底边，规避 `overflow:hidden` 时 `scrollHeight` 可能未覆盖最后内容的情况。
- 添加 `export-status-layout.test.js`，测试顺序、可见/隐藏提示高度预算、先重排后通知宿主。

## 测试

- 新增的 3 项布局回归与保存/版本相关测试共 8 项通过。
- 全套测试：88 通过、2 跳过、4 组因本容器缺少原项目的 `@modelcontextprotocol/sdk`、`pako` 等 npm 依赖而无法启动；真实 Cursor UI 尚待验收。

## 安装和验收

在 v0.1.10 上更新源码，保留本机/远程已有的 `vendor/drawio-webapp/` 与依赖，然后重启当前 Cursor MCP 进程；请使用**新产生的 Viewer 卡片**测试（旧卡片的 HTML 不会自动更新）。

1. 使用足够高的图，让 Viewer 占满内联卡片。
2. 依次点击 `PNG`、`Save .drawio`；两个保存路径应显示在工具栏**上方**，不会跑到卡片边界下。
3. 验证超长 Windows/Linux 路径换行后也能选中复制，图形与工具栏不互相盖住。

注意：当前测试容器无完整官方 Editor 资源，且浏览器访问受策略限制，未能在真实 Cursor MCP App 宿主中复现验证最终布局效果。
