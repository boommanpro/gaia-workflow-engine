# 节点级紧凑模式（n8n 方卡，2026-11-07）

状态：**已实施并通过浏览器验收（2026-11-07）**。当日第二轮优化（[editor-ui-polish-2026-11-07.md](./editor-ui-polish-2026-11-07.md)）将收起入口从「悬停卡上方框按钮」改为**卡片头常驻按钮**（原 ⤢ 查看 Schema 位置，Schema 入口移入 ⋯ 菜单），并从完整卡/紧凑卡撤下副标题摘要。用户确认方案：删除全局紧凑配置，改为节点级收起/双击展开；紧凑形态采用 n8n 风格方卡。上游设计：本文件随 2026-11-07 会话交互设计稿（含可操作原型）实施；替代 [node-compact-mode-redesign-2026-11-06.md](./node-compact-mode-redesign-2026-11-06.md) 的全局胶囊方案。

## 与 2026-11-06 方案的差异

| 维度 | 旧（11-06，已废弃） | 新（11-07，本文件） |
|---|---|---|
| 触发 | 设置面板全局开关 `gaia.editor.prefs.compact` | 节点级：完整卡悬停/选中 → 上方 26×26「框按钮」单击收起；双击紧凑卡展开 |
| 形态 | 260px 单行胶囊（芯片+标题+状态点） | 92×92 n8n 方卡：分类色线描图标 + 标签外置下方（12px 标题 + 10.5px 副标题，省略） |
| 状态 | 7px 徽标点 | 边框光环换色（box-shadow，不抖布局）+ 右下角 18px 徽标（旋转环/✓/✕），色值口径同 `statusDotColor` |
| 存储 | localStorage 全局布尔 | `gaia.editor.nodeCompact` = { [workflowCode]: nodeId[] }；作用域=路由 `/editor/:workflowCode`，其他画布不启用 |
| 不变 | 单击选中+右侧表单、右键菜单、拖拽、连线、端口「+」抑制、loop 容器不参与、校验 ErrorIcon、动态端口 `[data-port-id]` 契约 | 同左 |

既定决策（2026-11-07 用户确认）：图标取变体 A（分类色线描，非实底芯片）；收起后**不自动重排**（需收紧间距手动「自动布局」，沿用 11-06 决策）；旧全局偏好**不迁移**（升级后默认全部完整卡）。

## 实施记录

- 新增 `apps/console/src/node-compact-store.ts`：per-workflow 折叠集读写 + window 事件广播；localStorage 失败降级内存 Map；`useNodeCompact(nodeId)` 订阅 hook（scope 取 `useParams().workflowCode`，非专家编辑器画布返回 disabled）。
- `base-node/index.tsx`：compact 状态源由 `prefs.compact` 改为 store；`isContainer` 守卫保留；移除临时展开 state（展开即写回 store）。
- `base-node/node-wrapper.tsx`：完整卡上方框按钮（悬停/选中显现、只读与非编辑器画布不渲染、点击 stopPropagation 不开表单面板）；紧凑卡 tooltip 增加「双击展开」提示行；紧凑态 wrapper 附加 `st-processing/st-succeeded/st-failed` 状态类。
- `base-node/styles.tsx`：`&.compact` 改 92px 方卡规格（圆角 12、选中 2px 光环 + 3px 泛光）；新增 `FoldButtonStyle`（悬停/选中显隐、accent hover）；状态光环全部走 box-shadow（不改变 border 宽度，避免引擎测量抖动）。
- `compact-node/index.tsx`：重写为 n8n 方卡（`getNodeVisual` 单源图标 30px 分类色线描、标签外置下方、状态徽标）；高度 ≤2 输出口 92、>2 按 16px/口 扩展封顶 140；RailSlot/`updateDynamicPorts` 契约原样保留。
- `editor-prefs.ts` / `editor-prefs-panel` / `editor.tsx` / i18n：删除 `compact` 字段、「工作区→紧凑模式」开关（分区整体移除）、`gaia-editor-compact` 根类、`prefs.compactMode`/`prefs.secWorkspace` 及遗留 `prefs.density*` 死键；新增 `nodeCompact.collapse`/`nodeCompact.dblclickHint`。
- 新增 `apps/console/src/__tests__/node-compact-store.test.ts`（5 用例：scope 隔离、末节点清键、undefined scope 不启用、损坏存储降级、事件广播）。

**契约影响：无**（纯展示层；折叠态不进 DSL、不回流后端；节点 Schema/端口/执行器未动，`specs/node-contracts/status.md` 无需变更）。

## 验证（P-06 口径，2026-11-07 实测）

- `tsc --noEmit`：改动前后均 29 个存量错误（test-case-panel/admin/runtime-plugin 等，与本改动无关），**0 新增**（stash 对照验证）
- `eslint` 改动文件：0 error 0 warning（editor.tsx 存量 3 个 prettier warning 位于未触碰行，未处理）
- `vitest run src/__tests__/node-compact-store.test.ts src/nodes src/components/base-node src/components/compact-node src/form-components`：5 文件 35 用例全过（含新增 5 例）
- 浏览器实测（wf_087b971f1357，6 节点）：旧全局 `compact:true` 被忽略、默认全部完整卡；悬停/选中浮现框按钮、单击收起为 92×92 方卡（图标/标签/双输出口连线正确，截图确认）；双击展开回完整卡；刷新后收起状态保持（store 按工作流写入）；设置弹层无「紧凑模式」入口；试运行后紧凑卡 `st-succeeded` 光环 + ✓ 徽标 DOM 确认
- 未验证范围：运行中旋转环动画的视觉走查（截图通道超时，仅 DOM 类名确认）、深色主题紧凑态走查、>2 动态输出口（branches 多分支）方卡加高形态、触屏设备
