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
    created_at TEXT
);