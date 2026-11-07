# 编辑器交互优化五项（2026-11-07 第二轮）+ 第三轮三项

状态：**已实施并通过浏览器验收（2026-11-07）**。第二轮 5 项 + 第三轮 3 项全部落地；其中「描述不能修改」为真实 bug，已定位根因并修复。

## 1. 收起按钮固定到卡片头（替换 ⤢ 查看 Schema）

- 「⤢ 查看 Schema」按钮从卡片头移除（入口并入 ⋯ 菜单，见 §2）；原位置改为**常驻**的收起按钮（minimize 线描图标，`nodeCompact.collapse` tooltip）。
- 删除 2026-11-07 上午实现的「悬停卡上方浮现框按钮」（`FoldButtonStyle` 及 NodeWrapper 挂载整体移除）；双击紧凑卡展开、状态光环、tooltip 均不变。
- 实现：`form-components/form-header/index.tsx` 直接消费 `useNodeCompact(node.id)`（容器节点/只读/非编辑器画布不渲染），点击 `stopPropagation` 不触发选中开面板。

## 2. ⋯ 菜单「导出 JSON」→「查看 Schema」

- `components/node-menu/index.tsx`：删除实例 JSON 下载逻辑，新增 `查看 Schema` 菜单项，打开既有 `NodeSchemaModal`（左契约树 + 右实例 JSON）。
- **附带修复**：`node-schema-view/modal.tsx` 增加 `getPopupContainer={() => document.body}`——此前 Modal 被 BaseNode 的 ConfigProvider portal 进画布渲染层，受 zoom 变换影响宽度塌陷至 114px；修复后 880×574 居中弹窗（与 DSL 编辑器同口径，非全屏）。

## 3. 节点描述不能修改（bug 修复）

- **现象**：画布卡片上双击描述进入就地编辑，输入后回车/失焦，描述被**清空**（侧栏 TextArea 正常）。
- **根因**：`form-components/form-content/index.tsx` 提交时读 `inputRef.current?.value`——Semi `Input` 的 ref 是组件实例而非原生 input（`.value` 为 undefined），`onChange(undefined || '')` 把描述写成空串；`TextArea` 的 ref 恰好直达 DOM 所以一直正常。
- **修复**：改为受控 `draft` state（进入编辑时以当前值初始化，`onChange` 更新，Enter/Esc/失焦按 draft 提交），ref 仅用于 focus。浏览器实测：侧栏写入 → 画布双击追加 → 保存成功。

## 4. 卡片不再展示参数摘要副标题

- 「输入 input · score」「JavaScript」这类副标题来自 `nodes/node-visuals.ts` 的 `getSubtitle`（节点关键参数一行摘要，2026-11-05 引入）。
- 按用户决策从展示面撤下：完整卡（`form-header` 不再渲染 `Subtitle`，样式导出一并删除）与紧凑方卡（caption 仅标题）。函数保留——紧凑卡悬停 tooltip 仍显示摘要（hover 才可见）；左侧节点面板展示的是 `palette.desc.*` 静态描述文案，与本次无关、未动。

## 5. 工具栏精简

- 移除「小地图」开关按钮（`minimap-switch.tsx` 删除；小地图面板本身常显）；移除「添加节点」按钮及 `prefs.addToolbarBtn` 偏好字段（添加节点走左侧面板/右键/拖线，其余添加方式不变）。
- 「测试用例」按钮与图标按钮统一为 32×32：根因是自绘 SVG 作为 IconButton `children` 而非 `icon` 属性（children 走普通按钮内边距，实测 46px），改为 `icon={IconTestCase}`。
- i18n：删 `tool.minimap`；`nodeMenu.exportJson` → `nodeMenu.viewSchema`。

## 验证（P-06 口径，2026-11-07 实测）

- `tsc --noEmit`：29 个存量错误（基线不变，均为未触碰模块），**0 新增**
- `eslint` 改动文件：0 error 0 warning
- `vitest run`：`src/components` 11 用例 + 紧凑相关 5 文件 35 用例，全过
- 浏览器实测（wf_087b971f1357）：工具栏按钮实测全部 32px（缩放百分比 42px 文本钮、试运行 86px 主钮除外），无小地图开关/添加节点；小地图面板仍在；卡片头为「收起 + ⋯」；⋯ 菜单=创建副本/查看 Schema/删除，Schema 弹窗 880×574 非全屏、契约树+实例 JSON 齐全；描述侧栏写入→画布就地修改→保存成功（修复前该路径必清空）；完整卡与紧凑方卡均无副标题；测试数据（描述/收起状态）已清理还原
- 未验证范围：深色主题走查、触屏设备

**契约影响：无**（全部展示层；未动 node-schemas/执行器/DSL）。

---

## 第三轮（2026-11-07 晚）：拖拽复发 bug + 工具栏分组调整

### 6. 首次拖入节点「一闪即逝」复发（竞态加固）

- **机理**：左侧面板拖入的真实链路 = 物化节点 →（600ms 防抖）canvasSync 回流 store →（1.2s 尾沿）结构对齐 `applyNow` 比对 store 与挂载数据决定整份重挂。既有守卫只在 `__gaiaPaletteDrag` 为 true（指针按住）期间延迟重挂；**松手即释放标志**，加载期的对齐重挂若恰落在「已松手、尚未回流」的 ≤600ms 窗口，就会用不含新节点的 store 整份重挂，节点被吞（首次拖入最易命中：加载期 store 写入密集）。
- **修复**（`node-palette-rail/index.tsx`）：标志释放延迟 900ms（> 600ms 回流防抖 + 余量）；新一轮 pointerdown 会取消未生效的释放。加载期 `applyNow` 在宽限窗内继续按 600ms 重试，落点必然在 store 已含新节点之后。
- 浏览器实测：pointerup 后 300ms 标志仍 true、1200ms 已释放（宽限窗口成立）；真实手感复测待用户确认（合成指针事件无法完全复刻物化路径，属未验证范围）。

### 7. 工具栏第三轮调整

- 恢复「小地图」开关按钮，置于**自动布局左侧**（`minimap-switch.tsx` 自 git 恢复并补 aria-label）。
- 「变量 / 测试用例 / 运行历史 /（保存）/ 试运行」合并为**同一分组**（去掉变量与运行组之间的分隔线）。
- 最终分组：`撤销重做 | 缩放·适应 | 小地图·自动布局 | 变量·测试用例·历史·试运行`。
- 第三轮验证：`tsc` 29 存量 0 新增；`vitest` 16 用例过；浏览器实测分组顺序/小地图开关显隐均正常。

---

## 第四轮（2026-11-07 晚）：查看 Schema 弹窗对齐 DSL 编辑器（用户确认后执行）

用户确认：**同款但非全屏**（DSL 编辑器同款 Monaco 深色弹窗，960px 居中）+ **仅实例 JSON 可编辑**（确定后写回该节点）。

- `code-editor-modal/index.tsx`：新增 `title`、`fullScreen`（默认 true，DSL 编辑器行为不变）两个 props；`fullScreen={false}` 时渲染 960px 居中、body 64vh 的非全屏形态。
- `node-menu/index.tsx`：⋯ 菜单「查看 Schema」改挂 CodeEditorModal（fullScreen=false，标题 `查看 Schema · <节点标题>`）；**确定写回** = 整份 document JSON 中替换本节点后 `document.reload`（与 DSL 编辑器同一验证路径）；守卫：JSON 解析失败 / id、type 被改 → Toast 报错并中止关闭。
- 删除 `components/node-schema-view/`（左树右 JSON 双栏方案退役，唯一消费方即本菜单）；i18n 清理 8 个孤儿键，新增 `nodeSchema.jsonInvalid/mismatch`。
- 沿用实锤事实修正一处认知：DSL 编辑器弹窗（CodeEditorModal）此前带 `fullScreen` 属性实为**全屏**；本方案按用户「非全屏」诉求落在 960×(64vh+头脚) 居中。
- **后续追加（同日）**：用户决策 DSL 编辑器入口同样改为非全屏（`schema-editor.tsx` 传 `fullScreen={false}`），两个入口形态统一。

---

## 第五轮（2026-11-07 晚）：编辑器偏好面板改版（用户反馈：风格不一致、「更多」行点击差）

- **风格对齐 Semi**：标题区改 Semi `Title` + `Tag`（专家模式）；分区/开关行/单选组沿用 Semi 组件与统一 CSS 变量（`--semi-color-*`），去掉手写内联样式。
- **「更多」整行条目**：原「行标签 + 小『打开』按钮（且行内嵌套组件自己的图标钮）」改为**整行可点**（264×30px 命中区）：图标 + 标题 + 右侧箭头；「只读锁定」改为标签 + Switch 行（IconLock 小图标钮退役）；「快捷键帮助」同样整行。
- `readonly.tsx` / `report-editor` / `schema-editor` 三个组件随迁为整行条目（三者仅偏好面板消费）；行标签对齐用户词汇：`tool.reportEditor` →「运行报告」、`tool.schemaEditor` →「DSL 编辑器」（删孤儿键 `prefs.report/prefs.dsl`）。
- 验证：`tsc` 29 存量 0 新增；eslint 0；浏览器实测面板结构（Tag/分区/4 条整行 30px）/DSL 行点击 → 960px 非全屏 Monaco 弹窗 ✓。
- 验证：`tsc` 29 存量 0 新增；eslint 0；`vitest` 16 用例过；浏览器实测非全屏分支（临时翻 DSL 编辑器入口验证后还原）：960px 居中、Monaco、取消/确定齐全。**未验证范围**：⋯ 菜单 hover → 弹窗 → 编辑写回的端到端鼠标流（自动化悬停受浏览器窗口焦点限制无法触发 Semi Dropdown；菜单 hover 触发未改动，沿用一直在用的行为），待用户实测。


---

## 第六轮（2026-11-07 晚）：画布卡片变量/分支名短展示（用户反馈：内容展示不全）

- **变量 chip 短展示**：画布节点卡（`[data-node-compact]` 作用域）内 `.gedit-m-variable-selector-root-title`（「开始 - 」前缀）隐藏，chip 只剩 图标 + 末段变量名；条件/分支/赋值行的变量 chip 通用。完整「节点 - 变量」悬停 Popover 为 form-materials 既有能力（渲染在弹层容器，不受该 CSS 影响）；右侧表单面板不受影响。
- **branches 分支短名**：画布卡片分支标题只显示 `Branch N`（或用户自定义标题），原生 `title` 悬浮显示完整「标题 (id)」；右侧表单面板维持全串。改于 `branch-inputs/index.tsx`（isSidebar 分支）。
- 验证：`tsc` 29 存量 0 新增；eslint 0；浏览器实测条件卡 chip（root-title display:none、varName=score、行文本不再被前缀挤占）。未验证：branches 节点画布走查（当前工作流无该节点，右键/端口「+」/面板拖拽均依赖悬停触发，自动化不可达）——待用户实测。


---

## 第七轮（2026-11-07 晚）：变量 chip 图标与节点图标统一（用户反馈：logo 不一致）

- **根因**：变量 chip（form-materials variable-selector）前缀图标取自各节点注册表 `info.icon`——仍是 2026-11-06 视觉单源改造前的 `assets/icon-*.jpg|png` 旧位图，与卡片头的 node-visuals 分类色线描 SVG 不一致。
- **修复**：`node-visuals.tsx` 新增 `registryIcon(type)`（分类色 12px 线描 + 8px 右距，口径对齐原 renderIcon）；15 个节点注册表（start/end/block-*/condition/branches/loop/continue/break/code/string-format/variable/llm/http/workflow）`info.icon` 全部替换为该单源图标，删除散落的位图导入；`typings/node.ts` icon 类型放宽为 `string | ReactNode`。
- **消费面**：变量 chip（renderIcon 支持 ReactNode 直通）、变量 Dock 面板（本就兼容 ReactNode）同步统一；添加节点面板不消费 info.icon（自绘）不受影响。block-start 子画布的 40px 圆形装饰图不属于此口径，未动。
- 验证：`tsc` 29 存量 0 新增；`vitest src/nodes` 27 用例过；浏览器实测条件卡变量 chip：旧位图消失、SVG 图标颜色 = 来源节点分类色（开始=flow 蓝 #2f7df6），与卡片头同一套。期间 dev server 又崩溃一次（原生栈，非代码错误），重启后完成验证。


---

## 第八轮（2026-11-07 晚）：图标统一实底色块 + 紧凑态入 DSL（用户决策两项）

### 1. 变量 chip / 紧凑卡图标统一为「logo 底色」实底色块

- `registryIcon`（node-visuals 单源）改为 **16×16 圆角 5 实底分类色块 + 白色图形**——变量 chip、变量 Dock 与卡片头 `.gaia-node-chip` 同风格；紧凑方卡图标改为 **44×44 圆角 11 实底 tile + 22px 白图形**（白卡保留，图标块用 logo 底色）。四处节点图标展示面（卡片头/左栏面板/变量 chip/紧凑卡）风格完全一致。

### 2. 紧凑态从 localStorage 迁入 DSL（meta.compact），随草稿/版本持久化到后端

- **用户决策反转**：当日早间「折叠态不入 DSL」的约定按用户要求改为入 DSL——载入不同版本即呈现该版本的折叠形态。
- 实现链路：`typings` FlowNodeMeta +`compact`；`node-compact-store` 重写为 `useNodeCompact(node)`（写 `getNodeMeta()` 缓存 + 实体 `metaFromJSON`，双实例经 window 事件同步）；free-layout 默认序列化只输出 position，`meta.compact` 经 `use-editor-props.toNodeJSON` 钩子透传；meta 直改不触发 content change，toggle 手动 `canvasSync.onCanvasChange(['NODE_COMPACT_CHANGE'])` 回流（canvas-sync 放行该类型）。localStorage 方案与旧单测删除。meta 属视图层元数据（同 position），不进 node-schemas 契约。
- 浏览器实测：收起→刷新保持（localStorage 为空证明确走 DSL）；双击展开→刷新恢复；草稿链路全通。版本切换链路与草稿同路径（remount 读 meta）。

### 事故记录与防御（P-06 如实记录）

- 当日 dev server 三次崩溃（V8 堆 OOM，rsbuild 增量编译累积；已用 `--max-old-space-size=6144` 缓解）。第三次崩溃后增量模块图腐化，叠加一次手动回流把**空画布刷进了草稿**，画布清零（后端 v1.9 完好无损）。
- 防御：`canvas-sync` 增加空画布守卫——`next.isEmpty` 一律拒绝回流（旧守卫只在「双空」时跳过），并 warn 记录。
- 恢复：触碰 editor.tsx 强制重编译修复模块腐化后，画布从 v1.9 正常加载（6 节点）。IndexedDB `gaia-canvas` 快照曾整体清除（会话画布快照缓存，可从版本重建，无用户数据损失）。

- 回归：`tsc` 29 存量 0 新增；eslint 0；`vitest src/document src/nodes src/components` 68 用例全过。
