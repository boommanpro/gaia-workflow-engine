CREATE TABLE IF NOT EXISTS gaia_workflow_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_code VARCHAR(64) NOT NULL UNIQUE,
    template_name VARCHAR(128) NOT NULL,
    template_desc TEXT,
    template_data TEXT,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gaia_workflow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_code VARCHAR(64) NOT NULL UNIQUE,
    workflow_name VARCHAR(128) NOT NULL,
    workflow_desc TEXT,
    current_version_id INTEGER,
    revision INTEGER DEFAULT 0,
    template_code VARCHAR(64),
    source VARCHAR(16) DEFAULT 'user',   -- user=用户工作流 / session=会话草稿工作流（draft_<sessionKey>，不进列表）
    folder_id BIGINT,                    -- 所属项目（agent_work_folder.id），null=未分组
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gaia_workflow_version (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_code VARCHAR(64) NOT NULL,
    version_number VARCHAR(32) NOT NULL,
    version_desc VARCHAR(256),
    workflow_data TEXT,
    diff_json TEXT,
    created_by VARCHAR(64),
    created_at TEXT,
    is_current TINYINT DEFAULT 0,
    UNIQUE(workflow_code, version_number)
);

CREATE TABLE IF NOT EXISTS gaia_workflow_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_code VARCHAR(64) NOT NULL,
    version_number VARCHAR(32) NOT NULL,
    execution_id VARCHAR(64) NOT NULL UNIQUE,
    start_time TEXT,
    end_time TEXT,
    status VARCHAR(32),
    input_params TEXT,
    output_params TEXT,
    error_message TEXT,
    execution_duration BIGINT,
    invoke_channel VARCHAR(32),
    api_path VARCHAR(128),
    api_key_prefix VARCHAR(32),
    created_at TEXT
);

-- 工作流「发布为 API」主表（对话创建 API 模式）
CREATE TABLE IF NOT EXISTS gaia_workflow_api (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_code VARCHAR(64) NOT NULL UNIQUE,
    api_name VARCHAR(128),
    api_desc TEXT,
    version_number VARCHAR(32),
    api_path VARCHAR(128),
    api_key VARCHAR(128),
    status TINYINT DEFAULT 0,
    request_schema TEXT,
    response_schema TEXT,
    error_codes TEXT,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 对话会话表（多会话管理）
CREATE TABLE IF NOT EXISTS agent_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(128),
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0,
    debug_data TEXT,
    -- 工作空间（Codex 风格三区）
    scope VARCHAR(16) DEFAULT 'chat',    -- chat（对话）/ work（工作空间），两套逻辑隔离
    folder_id BIGINT,               -- 所属工作文件夹（agent_work_folder.id），null=未归入文件夹
    pinned TINYINT DEFAULT 0,       -- 置顶 0/1
    archived TINYINT DEFAULT 0,     -- 归档 0/1
    -- 执行引擎与会话映射（双引擎架构：local 自研 / ark 方舟托管）
    engine VARCHAR(16) DEFAULT 'local',          -- local | ark
    remote_session_id VARCHAR(128),              -- 方舟 sesn-*（engine=ark 时绑定）
    remote_agent_id VARCHAR(128),                -- 运行时绑定的方舟 agent-* 快照
    remote_agent_version INTEGER,                -- 绑定的方舟 Agent 版本
    token_usage TEXT,               -- 累计用量 JSON：{input_tokens, output_tokens, cache_read_input_tokens}
    model_id INTEGER                -- 会话绑定的模型条目（llm_model.id），NULL=跟随全局默认
);

-- 工作空间文件夹表（Work 模式：按文件夹分组的对话）
CREATE TABLE IF NOT EXISTS agent_work_folder (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(64) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 对话消息表（持久化历史对话）
CREATE TABLE IF NOT EXISTS agent_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key VARCHAR(64) NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT,
    tool_calls TEXT,
    thinking TEXT,
    timeline TEXT,
    tool_call_id VARCHAR(64),
    page_context TEXT,
    created_at TEXT,
    compacted INTEGER DEFAULT 0,    -- 1=已被上下文摘要取代，不再进入模型上下文
    images TEXT,                    -- 多模态图片（JSON 数组，base64）
    parent_message_id VARCHAR(64)   -- 父消息 ID（线程引用）
);
CREATE INDEX IF NOT EXISTS idx_agent_message_session ON agent_message(session_key, id);

-- Agent 产物表（Artifact 一等实体）
-- type: workflow（画布草稿/落版产物，每会话一行）/ plan（执行计划，每会话一行）
--       / test_report（试运行证据，追加式）/ release（发布收口记录，追加式）
-- status: streaming | stable | applied | discarded | proposed | completed | published
CREATE TABLE IF NOT EXISTS agent_artifact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artifact_key VARCHAR(96) NOT NULL UNIQUE,   -- 对外稳定标识：会话级产物为 "{sessionKey}:{type}"，追加式为 "art_xxx"
    session_key VARCHAR(64) NOT NULL,
    run_id VARCHAR(64),
    type VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'stable',
    title VARCHAR(128),
    summary VARCHAR(256),
    payload TEXT NOT NULL,                      -- JSON，schema 按 type 定义
    version INTEGER NOT NULL DEFAULT 1,         -- 同一 artifact 的第 N 次内容更新
    engine VARCHAR(16),
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agent_artifact_session ON agent_artifact(session_key, updated_at);

-- Agent 配置中心：LLM 参数 / 渠道配置 / 引擎选择 / workflow-architect 人设提示词 / 迁移标记
-- （默认系统提示词已迁 agent_prompt_config；节点知识已迁 agent_skill_file）
CREATE TABLE IF NOT EXISTS agent_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(128) NOT NULL UNIQUE,
    config_type VARCHAR(32) NOT NULL,
    title VARCHAR(256),
    content TEXT,
    config_data TEXT,
    description TEXT,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 配置变更历史（每次修改自动归档）
CREATE TABLE IF NOT EXISTS agent_config_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL,
    title VARCHAR(256),
    content TEXT,
    config_data TEXT,
    description TEXT,
    changed_by VARCHAR(64),
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_config_history_key ON agent_config_history(config_key, version);

-- 模型条目（owb 式「渠道+条目」的条目层）：用户可配多个模型，会话经 agent_session.model_id 绑定其一
CREATE TABLE IF NOT EXISTS llm_model (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name VARCHAR(128) NOT NULL,   -- 用户可见唯一名
    vendor VARCHAR(32),                   -- openai/qwen/glm/anthropic/deepseek/openrouter/ollama/custom
    base_url VARCHAR(256),
    api_key VARCHAR(256),
    model_id VARCHAR(128),                -- 上游模型 ID
    thinking_override VARCHAR(16),        -- auto/off/low/medium/high；空=跟随全局
    max_tokens INTEGER,
    context_window INTEGER,               -- 模型上下文窗口（token）；空=平台默认，压缩阈值按它算
    temperature DOUBLE,
    extra_body TEXT,                      -- 厂商私有参数（JSON）
    enabled INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
);

-- Agent 工具定义（动态管理）
CREATE TABLE IF NOT EXISTS agent_tool_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name VARCHAR(128) NOT NULL UNIQUE,
    tool_group VARCHAR(64) NOT NULL,
    description TEXT,
    parameters TEXT NOT NULL,
    page_contexts TEXT,
    enabled TINYINT DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- MCP 服务器（自定义外部工具来源）：连接后工具自动同步进 agent_tool_definition（tool_group='mcp'）
CREATE TABLE IF NOT EXISTS agent_mcp_server (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_name VARCHAR(64) NOT NULL UNIQUE,   -- 工具命名空间：mcp__<server_name>__<tool>
    transport VARCHAR(16) NOT NULL,            -- stdio | sse | http(streamable)
    command VARCHAR(256),                      -- stdio: 可执行命令（npx/uvx/node…）
    args TEXT,                                 -- stdio: JSON 字符串数组
    env TEXT,                                  -- stdio: JSON 对象（环境变量）
    url VARCHAR(512),                          -- sse/http: 服务地址
    headers TEXT,                              -- sse/http: JSON 对象（鉴权等请求头）
    enabled_tools TEXT,                        -- 断开时的启停快照（JSON 数组；重连按此恢复，保留手工禁用项）
    enabled TINYINT DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 会话持久事件日志（追加只写，v2）：turn/llm_end/tool_call/tool_result/knowledge_retrieved/confirm 等
CREATE TABLE IF NOT EXISTS agent_session_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key VARCHAR(64) NOT NULL,
    run_id VARCHAR(64),
    seq INTEGER NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    payload TEXT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_session_event ON agent_session_event(session_key, id);

-- 工具调用指标（v2）：每次调用一行的结局码/耗时/参数摘要
CREATE TABLE IF NOT EXISTS agent_tool_call_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key VARCHAR(64) NOT NULL,
    run_id VARCHAR(64),
    turn INTEGER,
    tool_name VARCHAR(128) NOT NULL,
    outcome VARCHAR(32) NOT NULL,
    error_code VARCHAR(32),
    duration_ms BIGINT,
    args_digest TEXT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_tool_call_log ON agent_tool_call_log(tool_name, outcome);

-- LLM 调用账本（generation 级观测，对标 OWB trace generation 层）：每次模型调用一行
CREATE TABLE IF NOT EXISTS agent_llm_call_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key VARCHAR(64) NOT NULL,
    run_id VARCHAR(64),
    seq INTEGER,
    model VARCHAR(128),
    messages_count INTEGER,
    tools_count INTEGER,
    prompt_digest TEXT,
    output_digest TEXT,
    request_json TEXT,               -- 真实请求（OpenAI 同构 messages+tools+options，首条全量/后续增量）——复现证据
    response_json TEXT,              -- 真实响应（流式组装后的完整输出：content+tool_calls+usage+finish_reason）
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    cached_tokens INTEGER,
    duration_ms BIGINT,
    status VARCHAR(16),
    error_message TEXT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_llm_call_log ON agent_llm_call_log(session_key, run_id);
-- ---------------------------------------------------------------------------
-- 已下线功能的存量清理（幂等）：知识图谱 / 权限体系（2026-10 简体重构）
--                              / RAG 知识库 / 双层记忆（2026-10-17 工具体系重构）
-- spring.sql.init.mode=always，每次启动执行；新库无这些表时为空操作。
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS agent_graph_node;
DROP TABLE IF EXISTS agent_graph_edge;
DROP TABLE IF EXISTS agent_permission;
DROP TABLE IF EXISTS agent_global_permission;
DROP TABLE IF EXISTS agent_knowledge_chunk;
DROP TABLE IF EXISTS agent_memory;


-- 工作流测试用例（2026-10-17 工具体系重构期3）：节点级（node_id 非空）/ 工作流级（node_id 为空）
CREATE TABLE IF NOT EXISTS workflow_test_case (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_code VARCHAR(128) NOT NULL,
    node_id VARCHAR(128),
    name VARCHAR(256) NOT NULL,
    description TEXT,
    inputs_json TEXT,
    expected_json TEXT NOT NULL,
    created_by VARCHAR(64) DEFAULT 'user',
    enabled TINYINT DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_workflow_test_case_code ON workflow_test_case(workflow_code, node_id);

-- 测试用例运行记录
CREATE TABLE IF NOT EXISTS workflow_test_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL,
    actual_json TEXT,
    assert_results_json TEXT,
    error TEXT,
    duration_ms INTEGER,
    source VARCHAR(16) DEFAULT 'manual',
    executed_at TEXT,
    is_deleted TINYINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_workflow_test_run_case ON workflow_test_run(case_id, executed_at);

-- Agent 人设/规范/压缩提示词配置（2026-10-17 期4）：IDENTITY/SOUL/AGENTS/COMPACTION
CREATE TABLE IF NOT EXISTS agent_prompt_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(64) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    scope VARCHAR(32) NOT NULL DEFAULT 'global',
    updated_by VARCHAR(64),
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 技能元数据（2026-10-17 期4）：原 node_knowledge 重构而来。正文不在此表，见 agent_skill_file
CREATE TABLE IF NOT EXISTS agent_skill (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(128) NOT NULL UNIQUE,
    description VARCHAR(512),
    kind VARCHAR(32) NOT NULL DEFAULT 'general',
    enabled TINYINT DEFAULT 1,
    source VARCHAR(16) DEFAULT 'user',
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);


-- Agent 技能文件（2026-10-17 期4 多文件版）：技能 = 目录，SKILL.md 为入口
CREATE TABLE IF NOT EXISTS agent_skill_file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name VARCHAR(128) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    is_deleted TINYINT DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    UNIQUE(skill_name, file_path)
);
CREATE INDEX IF NOT EXISTS idx_agent_skill_file_name ON agent_skill_file(skill_name, is_deleted);

-- 技能版本历史（技能级快照：所有文件的 JSON 拷贝）
CREATE TABLE IF NOT EXISTS agent_skill_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name VARCHAR(128) NOT NULL,
    version INTEGER NOT NULL,
    files_json TEXT NOT NULL,
    changed_by VARCHAR(64),
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_skill_history_name ON agent_skill_history(skill_name, version);

-- ====================================================================
-- 运行历史持久化（第一档 B：运行即证据——编辑器试运行的 run/节点级明细，
-- 替换只存在于内存、重启即丢的 InMemoryTaskRepository 报告）
-- ====================================================================

-- 运行实例（一次试运行一行）
CREATE TABLE IF NOT EXISTS workflow_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id VARCHAR(64) NOT NULL UNIQUE,
    workflow_code VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    error_message TEXT,
    inputs_json TEXT,
    outputs_json TEXT,
    node_count INTEGER,
    duration_ms BIGINT,
    trigger_channel VARCHAR(32) DEFAULT 'editor',
    started_at TEXT,
    finished_at TEXT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_workflow_run_code ON workflow_run(workflow_code, id);

-- 节点级执行明细（一次运行 N 行）
CREATE TABLE IF NOT EXISTS workflow_node_run (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_task_id VARCHAR(64) NOT NULL,
    node_id VARCHAR(64) NOT NULL,
    node_type VARCHAR(32),
    title VARCHAR(128),
    status VARCHAR(32),
    error_message TEXT,
    inputs_json TEXT,
    output_json TEXT,
    time_cost_ms BIGINT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_workflow_node_run_task ON workflow_node_run(run_task_id);
