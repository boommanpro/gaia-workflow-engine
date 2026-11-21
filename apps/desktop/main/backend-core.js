/**
 * 后端管理的纯逻辑（不依赖 electron / 网络进程，可单测）。
 * 运行时编排在 backend-manager.js。
 */

const DEFAULT_PORT = 48080;
const DEFAULT_API_BASE = `http://127.0.0.1:${DEFAULT_PORT}/api`;
/** 代码节点由后端现场以 -source 21 编译（JavaCompilerEngine），低于 21 无法运行 Java 代码节点 */
const MIN_JAVA_MAJOR = 21;

/**
 * 解析 `java -version` 输出版本号为主版本号。
 * @param {string} output java -version 的 stderr/stdout 混合文本
 * @returns {number|null} 21 / 17 / 8 ……；无法解析返回 null
 *
 * 形态示例：
 *   openjdk version "21.0.5" 2024-10-15 LTS      -> 21
 *   openjdk version "1.8.0_292"                  -> 8（旧式 1.x 前缀）
 *   java version "17.0.2" 2022-01-18             -> 17
 */
const parseJavaMajor = (output) => {
  if (typeof output !== 'string') {
    return null;
  }
  const match = output.match(/version "([^"]+)"/);
  if (!match) {
    return null;
  }
  const raw = match[1];
  const parts = raw.split(/[._+-]/).filter((p) => /^\d+$/.test(p));
  if (parts.length === 0) {
    return null;
  }
  // 旧式 1.8.0 -> major 8
  if (parts[0] === '1' && parts.length > 1) {
    return Number(parts[1]);
  }
  return Number(parts[0]);
};

/** 健康检查地址（后端 HealthController：GET /api/health -> {status:"UP"}） */
const buildHealthUrl = (port) => `http://127.0.0.1:${port}/api/health`;

/** 供 preload 注入 localStorage.apiBaseUrl 的地址 */
const buildApiBase = (port) => `http://127.0.0.1:${port}/api`;

/** spawn java 的完整参数（端口非默认时覆盖 --server.port） */
const buildJavaArgs = (jarPath, port) =>
  port === DEFAULT_PORT ? ['-jar', jarPath] : ['-jar', jarPath, `--server.port=${port}`];

/**
 * preload 是否应覆盖 localStorage.apiBaseUrl：
 * 仅当用户没有自定义过（空值或等于默认 48080 地址）时才写入，尊重既有配置。
 */
const shouldOverrideApiBaseUrl = (storedValue, candidateUrl) =>
  candidateUrl !== DEFAULT_API_BASE && (!storedValue || storedValue === DEFAULT_API_BASE);

module.exports = {
  DEFAULT_PORT,
  DEFAULT_API_BASE,
  MIN_JAVA_MAJOR,
  parseJavaMajor,
  buildHealthUrl,
  buildApiBase,
  buildJavaArgs,
  shouldOverrideApiBaseUrl,
};
