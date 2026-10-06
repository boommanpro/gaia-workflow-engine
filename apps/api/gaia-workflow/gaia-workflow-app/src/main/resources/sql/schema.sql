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
    template_code VARCHAR(64),
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
    -- 人工审查标记（用于会话质量分析和 event loop）
    review_rating VARCHAR(16),      -- good / bad / null
    review_issue TEXT,              -- 问题描述（哪里不好）
    review_status VARCHAR(32) DEFAULT 'pending', -- pending / analyzing / fixed / ignored
    review_fix_note TEXT,           -- 修复建议（给 coding agent 的指令）
    -- 执行引擎与会话映射（双引擎架构：local 自研 / ark 方舟托管）
    engine VARCHAR(16) DEFAULT 'local',          -- local | ark
    remote_session_id VARCHAR(128),              -- 方舟 sesn-*（engine=ark 时绑定）
    remote_agent_id VARCHAR(128),                -- 运行时绑定的方舟 agent-* 快照
    remote_agent_version INTEGER,                -- 绑定的方舟 Agent 版本
    token_usage TEXT                -- 累计用量 JSON：{input_tokens, output_tokens, cache_read_input_tokens}
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
    tool_call_id VARCHAR(64),
    page_context TEXT,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_message_session ON agent_message(session_key, id);

-- Agent 权限习惯表（per-action 可配置）
CREATE TABLE IF NOT EXISTS agent_permission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    policy VARCHAR(16) NOT NULL DEFAULT 'confirm',
    UNIQUE(session_key, action)
);

-- Agent 配置中心：在线管理 Prompt / 节点知识文档 / LLM 参数
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

-- Agent RAG 知识库分块
CREATE TABLE IF NOT EXISTS agent_knowledge_chunk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT,
    source VARCHAR(128),
    metadata TEXT,
    language VARCHAR(10) DEFAULT 'zh',
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 知识图谱 - 节点
CREATE TABLE IF NOT EXISTS agent_graph_node (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_key VARCHAR(128) NOT NULL UNIQUE,
    node_type VARCHAR(64) NOT NULL,
    title VARCHAR(256) NOT NULL,
    properties TEXT,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 知识图谱 - 边
CREATE TABLE IF NOT EXISTS agent_graph_edge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key VARCHAR(128) NOT NULL,
    target_key VARCHAR(128) NOT NULL,
    edge_type VARCHAR(64) NOT NULL,
    properties TEXT,
    created_at TEXT,
    is_deleted TINYINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_agent_graph_edge_source ON agent_graph_edge(source_key);
CREATE INDEX IF NOT EXISTS idx_agent_graph_edge_target ON agent_graph_edge(target_key);

-- Agent 工具定义（动态管理）
CREATE TABLE IF NOT EXISTS agent_tool_definition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_name VARCHAR(128) NOT NULL UNIQUE,
    tool_group VARCHAR(64) NOT NULL,
    description TEXT,
    parameters TEXT NOT NULL,
    default_policy VARCHAR(16) NOT NULL DEFAULT 'confirm',
    page_contexts TEXT,
    enabled TINYINT DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- Agent 全局默认权限（跨会话生效）
CREATE TABLE IF NOT EXISTS agent_global_permission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action VARCHAR(64) NOT NULL UNIQUE,
    policy VARCHAR(16) NOT NULL DEFAULT 'confirm'
);