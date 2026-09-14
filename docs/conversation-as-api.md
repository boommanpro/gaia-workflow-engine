# 对话创建 API —— 模块划分与关键实现说明

> 本次改造把产品主轴从「画布编辑」切换为「**以对话为核心创建 API**」：
> 用户用对话描述需求 → AI 编排工作流 → 一键发布为 API → 用接口调用 → 在调用看板看数据。
> 首页参考 DeepSeek 式的「简洁居中对话入口 + 清晰导航 + 充足留白」。

---

## 一、路由与页面形态

| 路由 | 形态 | 说明 |
|---|---|---|
| `/` | **产品首页**（新） | DeepSeek 风居中对话入口。输入 → 建会话 → 跳 `/c/:key`，由工作区自动发出首条消息 |
| `/c/:sessionKey` | AI 工作区（对话主位） | 不变。对话即创作，产物即工作流 |
| `/preview` | **预览页**（原 `/home` 改造） | 工作流画布缩略预览 + 对话示例，**不再作为创作主入口** |
| `/docs`、`/docs/:workflowCode` | **API 调用文档**（新） | 列表 / 详情：接口地址、鉴权、请求·响应参数、调用示例、错误码 |
| `/dashboard`、`/dashboard/:workflowCode` | **调用数据看板**（新） | 总览 / 单 API：调用量、按天趋势、平均与 P95 延迟、成功率、失败分布 |
| `/editor/:workflowCode` | 专家模式（画布主位） | 顶部新增「发布为 API」入口 |
| `/admin/*`、`/releases` | 管理后台 / 版本记录 | 不变 |

**踩坑记录：API 文档路由必须叫 `/docs`，不能叫 `/api-docs`。**
`rsbuild.config.ts` 里把 `/api` 前缀代理到后端（48080），`/api-docs` 会被代理吞掉直接命中 Spring，
页面返回 Whitelabel 404。**任何新增前端路由都不要以 `/api` 开头。**

---

## 二、前端模块划分（`apps/console/src`）

```
pages/
  LandingPage.tsx        首页：居中对话入口 + 极简导航（预览 / API 文档 / 调用看板 / 管理后台 / 语言）
  PreviewPage.tsx        预览页：工作流卡片（画布缩略 + 已发布标记 + 三个去向入口），响应式网格
  ApiDocsPage.tsx        API 文档：列表 + 详情（含 curl 示例、错误码表、重置 Key / 下架）
  DashboardPage.tsx      调用看板：总览 + 单 API（指标卡 + 折线 + 环形 + 条形）
  dashboard/charts.tsx   轻量 SVG 图表（零第三方依赖，viewBox 自适应）
components/
  ContentTopNav.tsx      内容页共用顶栏（粘性 + 移动端抽屉）
  ScrollPage.tsx         可滚动外框（内容页容器，独立模块避免 App 循环依赖）
agent/
  initialPrompt.ts       首页 → 工作区的「首条消息」交接（模块级单例）
```

### 关键实现点

1. **首页发起对话**：`createSession()` 现在返回 `sessionKey`；首页把用户输入写进 `initialPrompt`，
   再 `navigate('/c/' + key)`。`AiWorkspace` 挂载时若存在待发提示，自动 `sendMessage` 并清空。
2. **预览页画布缩略**：复用 `WorkflowViewer`，新增 `minimal` 属性 —— 只读、隐藏工具栏（缩放/撤销等
   编辑器控件出现在卡片里没有意义）。只读模式下 `fitView` 会延迟再适配一次，避免卡片首帧尺寸未稳定
   导致节点跑出可视区。
3. **图表零依赖**：SVG + `viewBox`，宽度 100% 自适应；移动端单列堆叠。
4. **i18n**：新增 `nav.*` / `landing.*` / `preview.*` / `apiDocs.*` / `dashboard.*` 五组键，
   中英两套词典同步补齐（缺 key 时 `t()` 返回 key 本身，不会走兜底文案）。

---

## 三、后端模块划分（`apps/api/gaia-workflow`）

### 新增

```
infra/.../entity/GaiaWorkflowApi.java              发布记录实体（gaia_workflow_api）
infra/.../mapper/GaiaWorkflowApiMapper.java
infra/.../service/GaiaWorkflowApiService.java
infra/.../service/impl/GaiaWorkflowApiServiceImpl.java
      · publish / unpublish / regenerateKey / getMeta / getByCodeAndKey / listPublished / buildStats
      · deriveRequestSchema：从工作流 start 节点推导对外请求契约
app/.../controller/api/GaiaWorkflowApiController.java       管理面：发布 / 下架 / 重置 Key / 列表 / 元信息 / 统计
app/.../controller/api/GaiaWorkflowApiInvokeController.java 调用面：POST /api/v1/wf/{workflowCode}
app/.../config/ApiKeyAuthInterceptor.java                    X-API-Key 鉴权（含失败落日志）
app/.../config/ApiKeyWebConfig.java                          仅拦截 /api/v1/wf/**
app/.../config/MybatisMetaObjectHandler.java                 created_at / updated_at 自动填充
resources/sql/migration_api.sql                              迁移脚本
resources/sql/migrate_api.sh                                 幂等迁移脚本（可重复执行）
```

### 修改

- `GaiaWorkflowLog`：新增 `invoke_channel` / `api_path` / `api_key_prefix` 三列。
- `GaiaWorkflowExecuteController`：写入 `invoke_channel='api'`，让老的 `/api/execute/{code}` 也计入看板。
- `schema.sql`：同步新表与新列（新库一次建好）。

### 端到端链路

```
发布：POST /api/workflow-api/publish {workflowCode, apiName, apiDesc}
      → 校验工作流与当前生效版本 → 生成 sk-xxx → 存请求/响应/错误码契约 → 返回明文 Key（仅此一次）
调用：POST /api/v1/wf/{workflowCode}   Header: X-API-Key: sk-xxx
      → 拦截器校验 → 取当前生效版本 → WorkflowExecutor 执行 → 落 gaia_workflow_log
      → 返回 { success, data, message, executionId }
看板：GET /api/workflow-api/stats/overview | /stats/{workflowCode}
      → 聚合 totalCalls / successRate / avgDurationMs / p95DurationMs / 30 天趋势 / 失败分布
```

### 三个容易踩的点

1. **`@TableField(fill = ...)` 需要 `MetaObjectHandler` 才生效**。工程里原先没有该 Bean，
   `created_at` 一直是 NULL，看板按天聚合全部落空。已补 `MybatisMetaObjectHandler`。
2. **CORS 预检必须放行**。自定义拦截器先于 Spring 的 CORS 处理执行，OPTIONS 请求不带自定义头，
   不放行会被拦成 401，浏览器侧调用直接失败。
3. **鉴权失败也要计一笔**。401 发生在拦截器、进不了控制器，若不补日志，看板的「失败分布」永远看不到
   最常见的 Key 错误，指标会失真。

---

## 四、本地运行与数据迁移

```bash
# 1) 迁移数据库（幂等，可重复执行）
bash apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/sql/migrate_api.sh gaia_workflow.db

# 2) 后端（沙箱内会被网络层拦成 401，必须用真实环境启动）
java -jar apps/api/gaia-workflow/gaia-workflow-app/target/gaia-workflow-app-0.0.1-SNAPSHOT.jar \
  --server.port=48080 \
  --spring.datasource.url=jdbc:sqlite:/abs/path/to/gaia_workflow.db

# 3) 前端
cd apps/console && NODE_ENV=development npx rsbuild dev --port 3311
```

迁移脚本做三件事并回填历史数据：建 `gaia_workflow_api` 表、给 `gaia_workflow_log` 加三列、
把历史执行的 `invoke_channel` 补成 `api`、用 `start_time` 回填空的 `created_at`。

---

## 五、改动前后对照

| 维度 | 之前 | 之后 |
|---|---|---|
| 首页 | AI 工作区（对话直接开在 `/`） | DeepSeek 风落地页，对话入口居中，发起后进入 `/c/:key` |
| 产品介绍 `/home` | 创作入口的说明页 | 改造为 `/preview` 预览页（画布缩略 + 示例对话） |
| 发布 | 无 | 编辑器「发布为 API」→ 端点 + Key + 打开文档 |
| 鉴权 | 无（`/api/execute` 裸奔） | API Key（`X-API-Key`），仅拦 `/api/v1/wf/**` |
| 文档 | 无 | `/docs` + `/docs/:code`，契约从工作流自动推导 |
| 数据 | `gaia_workflow_log` 只存不聚合 | `/dashboard` 指标卡 + 折线 + 环形 + 失败分布 |
