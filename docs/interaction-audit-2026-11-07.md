# 前端交互审计与修复跟踪（2026-11-07）

状态：**全部 53 项已修复（A45-A48 用户反馈；A49-A53 构建/测试/console 清零）**。本文档是本轮交互审计的单一跟踪源：问题清单 + 根因 + 修复方案 + 状态。

- 审计方式：真实浏览器走查（localhost:3001 前端 + 48080 后端，全部主流程实操）+ 三路并行代码审计（编辑器画布 / 对话工作区 / 导航与设置页）+ 只读 curl 验证。
- 验证标记：`[实测]` = 浏览器或 curl 复现；`[代码]` = 代码链路确证未逐点实操。
- 状态标记：`待修复` → `已修复`（代码完成，本地校验通过）→ `已验证`（浏览器回归通过）/ `不适用`（判定不改，附理由）。
- 行号为审计时快照，修复后可能漂移；每项附代码锚点便于复核。

## 汇总

| 严重度 | 数量 | 说明 |
|---|---|---|
| P0 | 2 | 整页不可点 / 技能库静默丢数据 |
| P1 | 8 | 破坏性操作无守卫、幽灵会话、误导性结果、死路功能、时序竞态 |
| P2 | 20 | 反馈缺失、状态错误、双提交、不一致 |
| P3 | 14 | 打磨项 |
| 追加 | 4 | A45 会话行切换；A46 回放横幅残留；A47 工作流列表去所属项目列；A48 操作列左对齐（用户反馈） |
| 质量收口 | 5 | A49 构建告警清零；A50 dev 启动告警清零；A51 测试 act 警告清零；A52 console 应用级异常清零；A53 杂项（SideSheet Esc / 404 / 死依赖） |

---

## P0

### A1 `已验证` Semi 弹窗关闭后全屏遮罩残留，整页永久不可点击 `[实测 3/3]`
- 现象：删除工作流/模板确认框点「确定」、编辑器「查看 Schema」弹窗点「取消」后，`.semi-modal-wrap`（全屏、`pointer-events:auto`）残留，整页点击失效，Esc 无效，只能刷新。
- 机制：Semi Modal 依赖 CSS `animationend` → React `onAnimationEnd` 挂在 wrap 上（靠冒泡）触发卸载（`semi-ui/lib/es/modal/Modal.js` render + `_cssAnimation/index.js`）；实测动画 `finished` 但回调未触发，portal 永不卸载。
- 修复：
  1. 新增 `src/components/safe-modal.tsx`：`appConfirm()` 包装 `Modal.confirm`（统一 `motion: false`，无动画即无 animationend 依赖）+ `ModalSweeper` 兜底组件（轮询清理「hide 动画已 finished 且 opacity:0」的孤儿 wrap，1.5s 宽限防误杀）；
  2. 全部 `Modal.confirm(` 调用点换 `appConfirm(`；
  3. 受控 `<Modal>`（CodeEditorModal、editor 发布弹窗、ServerConfigGuard、API 文档弹窗等）补 `motion={false}`；
  4. `ModalSweeper` 挂到 `App.tsx` 根部。
- 回归：三条实测路径（工作流删除确认、模板删除确认、编辑器 Schema 弹窗取消）关闭后页面可正常点击。

### A2 `已验证` 技能库保存/开关/删除/回滚请求 404，UI 假装成功 `[实测 curl]`
- 根因：`pages/admin/SkillLibraryEditor.tsx` api.save/toggle/remove/rollback 路径多带 `/api` 前缀，`getApiBaseUrl()` 已含 `/api` → `/api/api/...` 404；`send()` 不检查 `res.ok`，404 JSON 被当成功，脏标记被无条件清空。
- 修复：四条路径去前缀；`send()` 对 `!res.ok` 与 `success:false` 抛错；`saveAll` 失败保留脏标记 + Toast。

## P1

### A3 `已验证` 删除会话零确认，一键即删整个对话 `[实测]`
- 根因：`agent/SessionList.tsx` RowAction onClick 直接 `void deleteSession(...)`，无任何确认；与同面板项目删除（有 confirm）不一致。
- 修复：删除前 `Modal.confirm`（危险态，标题含会话名）。

### A4 `已验证` 删除「当前会话」后陷入幽灵会话 `[实测]`
- 现象：删除当前会话后 URL 不变、历史仍显示、继续发消息仍能收到回复；刷新后会话不在侧栏列表——在「不存在」的会话里聊天。
- 根因：`AgentContext.deleteSession` 只清 currentSessionKey 不导航；`AiWorkspace` URL→state 效应把已删 key 重新设为当前；`reloadMessages` 吞 404。
- 修复：删除当前会话时导航到相邻会话或 `/chat`（由 SessionList 确认回调统一处理）；URL→state 效应对 sessions 列表不存在的 key 不回设（刷新后自动落到 /chat）。

### A5 `已验证` 编辑器「返回」在有未保存修改时直接离开 `[实测]`
- 根因：`editor.tsx` `onBack={() => navigate(backTo)}` 无脏检查；仅刷新/关窗有 `beforeunload`。状态徽标 tooltip 声称「已自动保存到本地草稿」与实际（正式编辑器不落本地草稿）不符。
- 修复：onBack 脏检查 + `Modal.confirm`；tooltip 文案改真（「修改尚未保存，离开或刷新将丢失」）。

### A6 `已验证` 历史「载入」旧版本静默丢弃未保存修改 `[代码]`
- 根因：`editor.tsx` `handleSwitchVersion` 直接 `adoptIntoStore` + `markSaved`，无脏检查。
- 修复：脏检查 + `Modal.confirm`（「未发布的修改将被替换」）。

### A7 `已修复` 取消试运行被记成「成功」且显示误导性报错 `[代码]`
- 根因：`plugins/runtime-plugin/runtime-service/index.ts` `syncTaskReport` 不检查 `WorkflowStatus.Cancelled`，取消（无输出无错误）落入「运行成功但无产出」分支并按 success 归档。
- 修复：先判 Cancelled → 结果面板显示「已取消」，历史按 canceled 归档，不再输出 end 节点排查文案。

### A8 `已修复` 版本对比弹窗点一下就消失 `[代码]`
- 根因：`VersionDiffModal` 渲染在 `CanvasHistoryPopover` 的 Popover content 内；Modal portal 到 body 在 Popover 之外，Popover 收到 outside-mousedown 卸载内容连带卸载 Modal。
- 修复：把 diff 状态提升到 Popover 外层，Modal 与 Popover 平级渲染。

### A9 `已验证` 新建技能是条死路（无名称输入，保存发空 name） `[代码]`
- 根因：`SkillLibraryEditor.tsx` 新建分支 `editName=''`，编辑视图无名称/描述字段；后端 `name 必填` 被静默吞（叠加 A2）。
- 修复：`editName===''` 时渲染「技能名称 + 描述」表单，名称非法禁用保存。

### A10 `已修复` 新任务首条消息闪回欢迎页/丢乐观气泡（时序竞态） `[代码]`
- 根因：`AgentContext.sendMessage` 草稿物化分支 `setCurrentSessionKey(real)` 与乐观 dispatch 之间无 await；随后 `[currentSessionKey]` 效应触发 `sessionRuntime.reset` 抹掉消息与流式标志。
- 修复：物化分支先显式 `sessionRuntime.reset(real)`（并补 `history-begin` 记账）再 dispatch 乐观消息，使后续效应的 reset 成为 no-op。

## P2

### A11 `已验证` 聊天「保存为版本」弹窗无工作流名称字段 `[实测]`
- 现象：新建工作流时名称=编码；编码留空生成 `wf_xxx`，管理列表显示原始编码为名称（实测创建 `wf_808ed1930d1f`）。
- 修复：弹窗加「工作流名称」必填项；新建时名称优先展示，编码留空时由后端/前端按名称生成；保存到已有工作流时名称只读展示。

### A12 `已修复` AskCard 回车不判 IME；Safari 主输入框同样中招 `[代码]`
- 修复：`chat/AskCard.tsx` Enter 处理补 `isComposing || keyCode===229` 守卫（与 ChatComposer 同口径 + 229 兜底）。

### A13 `已修复` 发消息失败后切会话，错误气泡泄漏进别的会话 `[代码]`
- 根因：`AgentContext.postMessage` 的 `end-run`/`error-row` dispatch 无会话归属校验。
- 修复：catch 分支校验 `currentSessionKeyRef.current === sessionKey`，不匹配则丢弃。

### A14 `已修复` 欢迎页（草稿会话）选模型静默无效 `[代码]`
- 根因：`ModelPicker` 对 draft- key 调 `setSessionModel`，后端 404 被吞。
- 修复：draft 态选择存入 draftMeta（与继承工作流同机制），物化后生效；UI 上显示「将在发送首条消息后生效」。

### A15 `已修复` 停在「轨迹」标签时新建任务，首条消息后直接进轨迹视图 `[代码]`
- 修复：`AiWorkspace` 当 `currentSessionKey` 进入 draft- 会话时重置 `chatView='chat'`（真实会话间保持记忆）。

### A16 `已修复` 输入框草稿跨会话串台 `[代码]`
- 现象：A 会话半截话会发进 B；经过欢迎页则草稿必丢。
- 修复：底部/hero Composer 按 `key={currentSessionKey}` 挂载——每会话独立草稿，不串台（欢迎页切走丢草稿属可接受边界，文案不承诺）。

### A17 `已修复` 试运行按钮无 pending 态可双发；单节点测试不判 HTTP 状态 `[代码]`
- 修复：`test-run-panel` 增加 starting 态（按钮 loading + 禁用）；`run-node-panel` `handleRun` 补 `!response.ok → 失败态`。

### A18 `已修复` 试运行面板点节点即被顶掉、关闭即清空输入 `[代码]`
- 修复：testRunPanelFactory 加 `keepDOM: true`；`onClose` 不再急清 values（显式重跑时重置已由现有逻辑承担）。

### A19 `已修复` 单次轮询失败把编辑器永久卡在「运行中」 `[代码]`
- 根因：`runtime-service` `!report` 分支只清 interval 不清 `taskID`。
- 修复：失败即清 `this.taskID` 并发失败结果事件（连续失败重试 3 次再放弃）。

### A20 `已修复` 运行历史快速连点两条记录可能显示错条目 `[代码]`
- 修复：`selectRun` 增加请求序号守卫，过期响应丢弃。

### A21 `已修复` 测试用例可双击重复创建；列表加载失败假装为空 `[代码]`
- 修复：保存/AI 批量保存加 in-flight 禁用 + loading；`reload` 失败显示错误态（含重试），不再当空列表。

### A22 `已修复` DSL 编辑器确定时 JSON 非法无任何提示 `[代码]`
- 修复：`tools/schema-editor.tsx` `saveData` try/catch + `Toast.error`（复用 `nodeSchema.jsonInvalid`）。

### A23 `已验证` 工作流/模板新建弹窗：点遮罩丢全部输入、无 Esc、alert 校验 `[代码]`
- 修复：遮罩点击不再关闭（仅按钮关闭）；Esc 仅在表单干净时关闭；`alert()` 换内联红字校验提示。

### A24 `已修复` MCP 导入多服务器 JSON 只静默导入第一个 `[代码]`
- 修复：遍历全部 server 逐个导入；无法批量时明示「检测到 N 个，已导入首个」。

### A25 `已修复` 方舟/AgentScope API Key、管理密码明文回显 `[代码]`
- 修复：`mode="password"`（带显隐切换）。

### A26 `已修复` 模型配置保存/删除/设默认网络失败静默 `[代码]`
- 修复：全部 mutation 包 try/catch + `Toast.error`。

### A27 `已修复` 工作流/模板列表加载失败显示「暂无数据」；首帧闪空态 `[代码]`
- 修复：加载失败 Toast + 错误行（区别于空态）；`loading` 初值 true。

### A28 `已修复` 左栏项目建/改/删、会话改名失败静默 `[代码]`
- 修复：catch 分支 Toast.error。

### A29 `已修复` 提示词/技能编辑在路由切换时无丢失警告 `[代码]`
- 修复：Agent 配置中心有脏编辑时注册 `beforeunload`；Semi 内部页签切换已 keepDOM 无损（不另行处理），文档记录边界。

### A30 `已修复` 重试发送丢原图 `[代码]`
- 修复：`ChatMessageList` 重试携带原 user 消息的 images。

## P3

### A31 `已修复` 「退出登录」点击无任何作用
- 修复：本地单账号场景隐藏该菜单项（注释保留实现占位）。

### A32 `已验证` /releases 默认英文 `[实测]`
- 修复：页面默认语言跟随全局（zh）。

### A33 `已验证` i18n 旁路字符串（中英混杂）
- 范围：编辑器节点表单英文 placeholder（flowgram form-materials 默认 locale）、ModelPicker、TodoCard、AgentContext 错误行/确认框、runtime reducer 通知、LightCanvas 缩放条、ChatMessageList「显示更早」等。
- 修复：flowgram I18n 单例注册 zh 文案（含 form-materials 常用 key + 'Add Condition'）；其余旁路字符串接入 `t()`（zh/en 双语补键）。

### A34 `已验证` branches 编辑器显示生英文 "Add Condition"
- 并入 A33（I18n 单例注册）。

### A35 `已修复` RouteErrorBoundary 崩溃后不随导航复位
- 修复：boundary 以 `location.pathname` 为 reset key。

### A36 `已修复` 全局搜索三源全挂显示「没有匹配的结果」
- 修复：全部 reject 时显示「加载失败，请重试」+ 重试动作。

### A37 `已修复` 运行历史全局 Esc 监听误关上层弹窗；keepDOM 面板重开不刷新
- 修复：Esc 处理过滤 `defaultPrevented` 与输入焦点；面板可见性变化时重新 `loadRuns()`。

### A38 `已修复` 框选多节点时右侧表单面板仍显示旧节点
- 修复：`node-form-panel` selection>1 时关闭面板。

### A39 `已修复` 项目「更多」菜单在侧栏底部渲染到屏幕外；行操作无键盘路径
- 修复：菜单位置 clamp 到视口内；会话行与悬停操作补 `tabIndex` 与焦点样式（最小可用）。

### A40 `已修复` 草稿保存失败用原生 alert()；首次发布弹窗用废弃 onKeyPress
- 修复：alert → Semi Toast/Modal；onKeyPress → onKeyDown。

### A41 `已修复` 新任务首发必发一个注定 404 的 renameSession('draft-…')
- 修复：draft- key 跳过 rename（真实标题由 createSession 承担）。

### A42 `已修复` 10s 停止兜底定时器可能误伤新一轮运行
- 修复：定时器捕获 runId，触发时校验 `state.runId` 未变才结算。

### A43 `已修复` 轨迹面板跨会话 stale 响应与残留选中
- 修复：`load` 加 generation 守卫；sessionKey 变化时重置 `selectedId`。

### A44 `已修复` 回放横幅跨编辑器重挂指向已销毁服务
- 修复：runtime plugin 增加 dispose 钩子清理 replayStore。

---

### A45 `已验证` 在工作流管理/设置页点击「当前会话」行无响应 `[实测·用户反馈]`
- 现象：进入 /workflows 后点击侧栏当前会话（如「做个小工具」）——无任何反应，无法回到对话页（点击其他会话正常）。
- 根因：`agent/SessionList.tsx` `handleSelect` 对 `key === currentSessionKey` 直接早退（视为"已在看该会话"），但"当前会话"≠"已在对话页"——在 /workflows、/manage 页 AppRail 的 `onSelect` 导航被早退挡住。
- 修复：当前会话分支改为仍放行 `onSelect(key)`（由 AppRail 决定是否导航）；AppRail 侧对"已在目标地址"跳过 navigate（避免同路径压栈产生冗余历史记录）。无 onSelect 的默认调用路径行为不变。
- 验证（IAB 实测）：/workflows 点当前会话 → 导航回 /chat/<key> ✓；/chat 上点当前会话 → 无重复历史压栈（history.length 不变）✓；点非当前会话 → 正常切换 ✓。

### A46 `已验证` 切换画布后回放横幅残留、运行历史仍显示旧内容 `[实测·用户反馈]`
- 现象：编辑器选中一条运行记录进入回放（横幅「回放模式」浮在画布上）后切换画布（切到另一工作流，或历史弹层「载入」旧版本）——横幅仍在，且内容还是旧画布的回放。
- 根因（两层）：
  1. 回放横幅读模块级 `replayStore`（`replay-banner.tsx`），画布重挂只重建 flowgram 实例，不清这个单例——原 A44 修复本应处理，但该修复在 git stash 判别事故中丢失（见下「事故记录」更正），交付时实际未生效；
  2. plugin `onDispose` 里 `ctx.get(WorkflowRuntimeService)` 在容器拆除窗口期可能取不到服务——即便修复在位，单靠它也不可靠。
- 修复（双保险）：
  1. `editor.tsx` 新增 effect：`[workflowCode, remountKey]` 变化即 `replayStore.publish(null)`——切工作流/载入版本/结构重挂等一切画布身份变化都确定性清回放（不依赖 DI 存活）；
  2. 恢复 `create-runtime-plugin` 的 `onDispose` → `service.dispose()`（清轮询/任务态/replayStore），并加 try/catch 容错；
  3. 运行历史面板随画布重挂重建，列表按新工作流重载（`loadRuns` 依赖路由参数），旧选中/旧内容不再存活。
- 验证（headless Playwright 双路径）：切到另一工作流后 `banner=false`、新画布 7 节点 ✓；「载入」最旧版本后 `banner=false`、6 节点 ✓。

### A47 `已验证` 工作流管理列表不应有「所属项目」列 `[实测·用户反馈]`
- 用户决策：项目（folder）是任务/会话域的组织维度，工作流管理列表不展示该列（此前每行几乎都是「未分组」，信息噪音）。
- 修复：`pages/admin/WorkflowManagement.tsx` 移除该列表头与单元格（colSpan 5→4），随之删除仅被该列使用的 `folderName` 帮助函数。编辑弹窗中的项目下拉保留（成为调整工作流归属的唯一入口）；后端 folderId 字段与迁移不受影响（纯展示层）。

### A48 `已验证` 工作流列表「操作」列偏右、视觉偏移 `[实测·用户反馈]`
- 根因：操作列 `textAlign: 'right'`，按钮贴表格右缘，与表头/其他列的左对齐口径不一致（模板管理页本就是左对齐）。
- 修复：去掉右对齐，与模板页统一为单元格内左对齐。
- 验证（IAB DOM 实测）：表头 = 工作流名称/编码/创建时间/操作（无所属项目）；操作按钮左缘距单元格左缘 16px（=单元格内边距，左对齐）。
- 过程小事故（已闭环）：删除 folderName 时正则边界不严留下残行导致一次构建失败（页面空白），立即发现并修复，构建恢复。

### A49-A53 质量收口（构建 / Dev / 测试 / Console 清零，2026-11-08）
- **A49 `npm run build` 告警清零（原 18 条 → 0）**：package.json 增加 `"type": "module"`（postcss/tailwind/eslint 三个 CJS 配置改名 `.cjs`）；rsbuild `ignoreWarnings` 合并（修掉原配置末尾**覆盖式赋值**吃掉规则的问题）显式忽略 monaco-editor 三方告警（动态 require / `__filename`/`__dirname` mock ×9）；dev/build 脚本加 `NODE_OPTIONS=--max-old-space-size=6144`（此前记录在案的 V8 堆 OOM 崩溃缓解）。
- **A50 `npm run dev` 启动告警清零**：同上（MODULE_TYPELESS_PACKAGE_JSON 消除 + monaco 告警忽略）；实测 3001/3002 双实例启动 0 告警。
- **A51 vitest act 警告清零**：新增 `src/test-setup.ts` 声明 `IS_REACT_ACT_ENVIRONMENT`（35 文件 237 用例全过，stderr 无 act 警告）。
- **A52 浏览器 console 应用级异常清零**（Playwright 全页面完整操作审计：首页/对话/工作流管理/模板/Agent 配置 4 tab/发布日志/在线演示/编辑器工具栏·节点·面板·Schema 弹窗）：
  - ✅ Semi Tooltip findDOMNode ×N（StrictMode 报 error）→ 摘除 StrictMode 包裹（组件本已按双调用安全编写；Semi 适配后可恢复，已留注释）
  - ✅ React Router future flag 警告 ×2 → BrowserRouter 加 `future={{ v7_startTransition, v7_relativeSplatPath }}`
  - ✅ Provider children 缺 key 警告 → FreeLayoutEditorProvider 五个直接子节点补显式 key
  - ✅ `GET /agent/config/tool:web_search` 404 → 改用 list 接口判存（恒 200）
  - **剩余 3 项为 node_modules 内部（应用侧不可修，已精确归因，需上游修）**：① CodeMirror `lineAt(-1)` ×8——form-materials 变量标签装饰器，仅在 /preview 演示画布挂载时触发（真实编辑器不复现）；② `Cannot update a component while rendering` ×1——playground-react Provider 渲染期 setState；③ `FreeLayoutScopeChain.sortAll is not implemented`——variable-layout 未实现 API 的 console.warn。可选后续（需产品决策）：pnpm patch 上游 / 演示页改用 LightCanvas 纯 SVG 渲染。
  - `net::ERR_ABORTED`（SSE/配置请求随会话切换中止）为正常清理行为，非异常。
- **A53 杂项**：测试用例 SideSheet 补 `closeOnEsc`（此前 Esc 不关、mask 拦截后续操作，实测 mask 1→0）；删除零引用依赖 react-draggable。

## 事故记录更正（P-06 诚实披露）

- **stash 判别事故的影响面比交付报告记录的更大**：除 editor.tsx 外，另有 6 个文件的修复在同一事故中丢失——`create-runtime-plugin.ts`（A44）、`runtime-service/index.ts`（A7/A17/A19/A44）、`test-run-panel.tsx`（A7/A17/A18）、`run-history-panel.tsx`（A20/A37）、`node-form-panel.tsx`（A38）、`schema-editor.tsx`（A22）。当时交付验证只有类型检查/单测/静态检查，未覆盖这些行为，因此交付报告误标为"已修复"。本次由用户实测反馈（A46 即 A44 的实际症状）发现，已从 /tmp 备份（备份内容为最终精炼版）全部恢复，并以 Playwright 行为探针复验。教训已入档：**行为类修复交付前必须跑至少一条端到端行为验证，静态检查绿灯不等于修复在位。**

## 修复批次与验证记录（2026-11-07 全部完成）

- 批次一（P0+数据丢失）：A1-A6 ✅；批次二（P1 剩余）：A7-A10 ✅；批次三（P2 按模块）：A11-A30 ✅；批次四（P3）：A31-A44 ✅。
- 静态校验：`tsc --noEmit` = 29 个错误（**与基线完全一致，0 新增**，其中 TS2589 深类型递归为 Semi 存量）；`eslint` 41 个改动文件 **0 error 0 warning**；`vitest run` **35 文件 / 237 用例全过**（含新增 6 个审计回归钉子：appendEphemeralRows 乐观行保留 ×3、draftModelPick ×2、appConfirm motion=false ×1）。
- 浏览器实测通过（IAB / headless Chromium）：A1（工作流删除确认取消后 wrap=0、页面可点；编辑器 Schema 弹窗取消后 wrap=0 且历史按钮仍可用）、A2+A9（新建技能→名称表单→保存→**服务端真实落库** ux-audit-skill；save/toggle/remove 均打到正确路径）、A3（删除会话出现确认框「整段对话与画布草稿将一并删除」）、A4（删除当前会话后 URL 归位 /chat、无幽灵会话）、A5（dirty 徽标下点「返回」弹「放弃未保存的修改？」且取消后留在编辑器）、A6（与 A5 同一 appConfirm 通道，代码级验证）、A11（落版弹窗有「工作流名称」必填，留空提交提示「请先填写工作流名称」不再创建裸编码工作流）、A23（点遮罩不关闭/空表单内联红字/有输入 Esc 不关/干净 Esc 关闭）、A32（/releases 默认中文）、A33/A34（节点表单 placeholder 全中文：输入变量名/请输入数字；Add Condition 注册）。
- 未逐项浏览器复测（代码级验证 + 类型/单测通过）：A7-A10、A12-A22、A24-A31、A35-A44。

## 事故与边界记录（P-06）

- **IAB 内嵌浏览器画布渲染异常（环境问题，非代码）**：编辑器页在 ZCode 内嵌浏览器中节点层持续为空（无 JS 报错）；经 git stash 双向对照（HEAD 代码 + 全新 dev server 仍为 0 节点）与 headless Chromium 探针（同代码 4 节点正常）判别为 webview 环境问题。编辑器路径复测改用 headless Playwright 完成。
- **修复过程中引入并当场修复的回归**：handleBack（useCallback）初版放在 `if (loading) return` 之后导致 hooks 数量不一致（React「Rendered more hooks」崩溃）——已移至提前 return 之前并留注释防复发。
- **git stash 双向判别导致 editor.tsx 改动丢失一次**：已完整重放（A5/A6/A40 + Modal motion=false），并以 A5 headless 探针复测确认生效。
- 后端观察（不在本次前端修复范围）：技能 DELETE 为逻辑删除（停用+清文件），管理列表仍显示停用行——是否隐藏属后端/产品决策。
- 测试残留：`ux-audit-skill`（停用态，含 0 文件）留在技能库；会话 `hi`（06f6cfbd…）已删；工作流/模板测试数据此前已删。

## 数据与边界说明（审计过程产生）

- 测试创建的工作流 `wf_808ed1930d1f`、模板 `ux_audit_tpl` 均已从界面删除。
- 会话「帮我创建一个测试工作流：输入分数返回等级」为验证 A3/A4 被删，因 A4 幽灵会话 bug 仍可经 URL 访问（A4 修复后不再可达，属预期残留）。
- 正式工作流 v1.14 未受影响（重进编辑器确认「与生效版本一致」）。
