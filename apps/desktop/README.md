# Gaia 桌面版（macOS · Electron）

Gaia 的 macOS 桌面形态：Electron 壳加载 console 前端（`app://` 自定义协议），**内嵌后端 jar 自动拉起**——双击即用，无需手动起 Java 服务（运行环境仍需 JDK 21+）。

## 环境要求

| 依赖 | 用途 | 版本 |
|------|------|------|
| Node.js / pnpm | 构建 | ≥22 / 11（`packageManager` 已固定） |
| JDK | 运行内嵌后端 + 代码节点现场编译 | **21+**（`-source 21` 硬约束） |
| Maven | 打包后端 jar | 3.x |
| macOS 工具 | 生成图标（可选） | sips / iconutil（系统自带；SVG 渲染用 Electron 离屏窗口） |

## 常用命令（在 `apps/desktop` 下）

```bash
pnpm install            # 安装 electron / electron-builder / vitest / playwright
pnpm test               # 主进程纯逻辑单测（协议解析 / java 版本解析 / 端口决策 / tray 模板提取）
pnpm e2e                # Electron 端到端（五场景：全栈 / 关窗常驻 / --hidden 后台 / 复用外部后端 / dev-renderer）
pnpm dev                # 开发模式：console rsbuild dev(3111) + Electron 热加载
                        #   GAIA_SKIP_BACKEND=1 pnpm dev 可跳过后端纯调前端
pnpm build:mac          # 完整打包：前端 build:electron + mvn jar + electron-builder
                        #   产出 out/Gaia-1.0.0-mac-{arm64,x64}.{dmg,zip}
pnpm build:mac:arm64    # 仅 Apple Silicon
pnpm build:mac:x64      # 仅 Intel
pnpm verify:packaged    # 直启打包产物跑全链路断言（含子路由 logo、健康检查、退出回收）
pnpm icon               # 由 build/icon.svg 重新生成图标（png + icns，macOS 规范圆角）
```

`prepare:frontend` / `prepare:backend` 可单独重跑某一侧资产；`GAIA_SKIP_MAVEN=1 pnpm prepare:backend` 复用已有 jar（e2e 快速迭代）。

## 运行时行为

- **后端编排**（`main/backend-manager.js`）：启动时先探活 `http://127.0.0.1:48080/api/health`——已有 Gaia 后端则直接复用；否则找 JDK ≥21（`GAIA_JAVA_PATH` → `JAVA_HOME` → `/usr/libexec/java_home` → PATH），拉起内嵌 jar。退出时只回收自己拉起的进程（SIGTERM 优雅停，5s 后 SIGKILL，整进程组）。
- **数据隔离**：SQLite 落在 `~/Library/Application Support/Gaia/data/gaia_workflow.db`（jar 进程 cwd），与仓库/部署实例互不干扰。后端日志在 `.../Gaia/logs/backend.log`，启动决策快照在 `.../Gaia/backend-status.json`。
- **端口决策**：48080 被非 Gaia 进程占用时自动换空闲端口，并通过 preload 注入 `localStorage.apiBaseUrl`（用户自定义地址优先，不会被覆盖）。找不到 JDK 时弹窗引导下载，应用仍可加载并指向远程后端。
- **app:// 协议**（`main/protocol.js`）：standard+secure+supportFetchAPI 特权 scheme，SPA fallback 支持 BrowserRouter 深链；异步读取 + ETag/304 协商缓存 + hash 资源 immutable 长缓存（net.fetch 流式透传在 Electron 45 对子资源有挂起问题，勿改回；readFileSync 会阻塞主进程造成切页卡顿，也勿改回）。

## 后台运行与托管

按 macOS 惯例**关窗 ≠ 退出**：

- 关闭窗口只是**隐藏**（常驻型应用惯例，如 Slack/Discord）：后端继续服务，重新打开是瞬时唤起而非整页重载（前端约 6MB JS，重载需 1~2 秒且丢失页面状态）。
- 点击 Dock 图标、Dock 右键菜单「打开主窗口」、菜单栏 Gaia 图标或 Cmd+N 均可唤回窗口。
- **菜单栏 Tray**（常驻）：显示后端运行状态与端口，提供「打开主窗口」「退出 Gaia」，点击图标直接唤起窗口。
- **开机自启动（后台）**：应用菜单 Gaia → 开机自启动（后台），或菜单栏 Tray 同名开关；登录后以 `--hidden` 形态启动——只拉起后端不开窗口，需要时再唤起。登录项仅在打包后的 Gaia.app 中生效。
- **彻底退出**：Cmd+Q、菜单「退出 Gaia」、Dock 右键「退出」，此时才回收后端 java 进程。

## 分发说明（未签名包）

本仓库不配置开发者证书，构建产物**未签名**。用户首次打开会遇到 Gatekeeper 拦截：

```bash
xattr -cr /Applications/Gaia.app   # 方式一：清除隔离属性后正常打开
# 方式二：右键 Gaia.app → 打开 → 再点「打开」
```

## 已知边界

- Windows / Linux 打包未在本包实现（electron-builder 配置只声明了 mac target）；Tray 当前仅 mac 形态（Windows 托盘需专门图标，暂未启用）。
- x64 包在 Intel Mac 上的原生运行未实测（本机为 Apple Silicon，已用 Rosetta 全链路验证；无 Intel 实机环境）。
- LLM 凭据仍按 Web 版方式在前端「模型配置」页录入（入后端 SQLite），或通过环境变量 `GAIA_LLM_API_KEY` 注入后透传给后端进程。
