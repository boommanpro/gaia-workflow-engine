/**
 * 后端进程编排：探测复用、寻找 JDK 21+、spawn 内嵌 jar、健康轮询、优雅退出。
 *
 * 关键决策（与后端事实对齐）：
 * · 健康检查 GET /api/health 返回 {status:"UP"}（HealthController）
 * · SQLite 路径 jdbc:sqlite:gaia_workflow.db 相对进程 cwd —— spawn 时把 cwd 指到
 *   userData/data，桌面版数据与仓库/部署数据完全隔离（照抄 Docker WORKDIR /data 模式）
 * · 48080 端口被非 Gaia 进程占用时：prod 模式自动改用空闲端口并通过 preload 注入
 *   localStorage.apiBaseUrl；dev 模式固定 48080（rsbuild dev proxy 目标写死 48080，
 *   换端口会打到别人的服务，此时直接报错让用户释放端口）
 *
 * 时序约定：prepare() 在创建窗口之前调用（其结果决定 preload 注入参数），
 * waitHealthy() 在 splash 展示期间轮询 —— 两段拆分使「长时间等 Spring Boot 启动」
 * 与「确定端口」解耦。start() 是两者串起来的便捷入口（e2e / 诊断用）。
 */

const { spawn, execFile } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');

const {
  DEFAULT_PORT,
  MIN_JAVA_MAJOR,
  parseJavaMajor,
  buildHealthUrl,
  buildJavaArgs,
} = require('./backend-core');

/** 单次 HTTP GET，超时/非 200/非 Gaia 健康体均返回 false */
const probeHealthOnce = (port, timeoutMs = 1500) =>
  new Promise((resolve) => {
    const req = http.get(buildHealthUrl(port), { timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(res.statusCode === 200 && JSON.parse(body).status === 'UP');
        } catch {
          resolve(false);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });

/** 端口是否可绑定（空闲） */
const isPortFree = (port) =>
  new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });

/** 随机取一个空闲端口 */
const getFreePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.once('listening', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.listen(0, '127.0.0.1');
  });

/** 执行 `java -version`，返回 stdout+stderr 文本（版本信息在 stderr） */
const runJavaVersion = (javaPath) =>
  new Promise((resolve) => {
    try {
      execFile(javaPath, ['-version'], { timeout: 5000 }, (err, stdout, stderr) => {
        // java -version 正常退出码为 0；即使非 0，stderr 也常含版本行，一并交给解析器
        resolve(`${stdout || ''}\n${stderr || ''}`);
      });
    } catch {
      resolve('');
    }
  });

class BackendManager {
  /**
   * @param {object} options
   * @param {string} options.jarPath 内嵌 jar 绝对路径（extraResources/backend/gaia-workflow-app.jar）
   * @param {string} options.dataDir SQLite 数据目录（后端进程 cwd）
   * @param {string} options.logDir 后端日志目录
   * @param {string} options.statusFile 状态快照 JSON 路径（e2e/诊断用）
   * @param {boolean} options.allowFallbackPort 端口被占时是否自动换端口（prod: true / dev: false）
   * @param {number} options.healthTimeoutMs waitHealthy 轮询总超时
   */
  constructor(options) {
    this.jarPath = options.jarPath;
    this.dataDir = options.dataDir;
    this.logDir = options.logDir;
    this.statusFile = options.statusFile;
    this.allowFallbackPort = options.allowFallbackPort ?? true;
    this.healthTimeoutMs = options.healthTimeoutMs ?? 90_000;
    this.child = null; // 仅记录“我们自己 spawn”的进程；复用外部后端时保持 null
    this.logFd = null; // 同步打开的日志 fd（Electron 的 spawn 不接受 fd 未就绪的 WriteStream）
    this.logPath = path.join(options.logDir, 'backend.log');
  }

  /** 决策结果统一落盘，供 e2e 断言与用户排障 */
  writeStatus(status) {
    try {
      fs.mkdirSync(path.dirname(this.statusFile), { recursive: true });
      fs.writeFileSync(
        this.statusFile,
        JSON.stringify({ ...status, jarPath: this.jarPath, logPath: this.logPath, at: Date.now() }, null, 2)
      );
    } catch {
      /* 状态文件失败不影响主流程 */
    }
  }

  /**
   * 找到 JDK ≥21 的 java 可执行文件。
   * 顺序：GAIA_JAVA_PATH → JAVA_HOME/bin/java → macOS /usr/libexec/java_home（高版本优先）→ PATH。
   */
  async findJava() {
    const candidates = [];
    if (process.env.GAIA_JAVA_PATH) {
      candidates.push(process.env.GAIA_JAVA_PATH);
    }
    if (process.env.JAVA_HOME) {
      candidates.push(path.join(process.env.JAVA_HOME, 'bin', 'java'));
    }
    if (process.platform === 'darwin') {
      // /usr/libexec/java_home -v N 精确匹配主版本；从高到低试探已安装的 ≥21 版本
      for (let major = 30; major >= MIN_JAVA_MAJOR; major--) {
        const home = await new Promise((resolve) => {
          try {
            execFile('/usr/libexec/java_home', ['-v', String(major)], { timeout: 3000 }, (err, stdout) =>
              resolve(err ? null : stdout.trim())
            );
          } catch {
            resolve(null);
          }
        });
        if (home) {
          candidates.push(path.join(home, 'bin', 'java'));
          break; // 只取最高的已安装主版本
        }
      }
    }
    candidates.push('java');

    for (const candidate of candidates) {
      const output = await runJavaVersion(candidate);
      if (!output) {
        continue;
      }
      const major = parseJavaMajor(output);
      if (major !== null && major >= MIN_JAVA_MAJOR) {
        return { path: candidate, major, raw: output.trim().split('\n')[0] };
      }
    }
    return null;
  }

  /**
   * 启动第一阶段（建窗前调用）。返回值 mode：
   * · reused        48080 已有 Gaia 后端，直接复用（不 spawn，退出时也不杀）
   * · spawned       内嵌 jar 已拉起（健康状态未知，需继续 waitHealthy）
   * · no-java       找不到 JDK 21+（前端仍可用，ServerConfigGuard 引导配置远程地址）
   * · port-conflict dev 模式下 48080 被非 Gaia 进程占用
   * · jar-missing   内嵌 jar 不存在（资源被裁剪或未执行 prepare:assets）
   * · spawn-error   spawn 系统调用失败
   */
  async prepare() {
    // 1) 已有 Gaia 后端在默认端口 → 复用
    if (await probeHealthOnce(DEFAULT_PORT)) {
      const result = { mode: 'reused', port: DEFAULT_PORT, pid: null };
      this.writeStatus(result);
      return result;
    }

    // 2) 找 JDK
    const java = await this.findJava();
    if (!java) {
      const result = { mode: 'no-java', port: null, pid: null };
      this.writeStatus(result);
      return result;
    }

    // 3) 端口决策
    let port = DEFAULT_PORT;
    if (!(await isPortFree(DEFAULT_PORT))) {
      if (!this.allowFallbackPort) {
        const result = { mode: 'port-conflict', port: null, pid: null };
        this.writeStatus(result);
        return result;
      }
      port = await getFreePort();
    }

    // 4) spawn（独立进程组，退出时整组回收；cwd=dataDir 让 SQLite 落在用户数据目录）
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
      fs.mkdirSync(this.logDir, { recursive: true });
    } catch {
      const result = { mode: 'spawn-error', port, pid: null, detail: 'cannot create data/log dir' };
      this.writeStatus(result);
      return result;
    }
    // 同步打开日志 fd：Electron 的 spawn 校验 stdio 流的 fd，异步 WriteStream 在
    // fd 未就绪时会被直接拒绝（The argument 'stdio' is invalid）
    try {
      this.logFd = fs.openSync(this.logPath, 'a');
    } catch (err) {
      const result = { mode: 'spawn-error', port, pid: null, detail: `cannot open log: ${err.message}` };
      this.writeStatus(result);
      return result;
    }

    try {
      this.child = spawn(java.path, buildJavaArgs(this.jarPath, port), {
        cwd: this.dataDir,
        detached: true, // 独立进程组：kill(-pid) 可一并回收 java 派生的编译子进程
        stdio: ['ignore', this.logFd, this.logFd],
        env: { ...process.env }, // GAIA_LLM_API_KEY 等随主进程环境透传
      });
    } catch (err) {
      this.closeLogFd();
      const result = { mode: 'spawn-error', port, pid: null, detail: err.message };
      this.writeStatus(result);
      return result;
    }

    const result = { mode: 'spawned', port, pid: this.child.pid };
    this.writeStatus(result);
    return result;
  }

  /**
   * 启动第二阶段：轮询健康直到 UP。
   * @returns {boolean} true=后端就绪；false=超时或进程提前退出（已回收，logPath 可排障）
   */
  async waitHealthy(port) {
    const deadline = Date.now() + this.healthTimeoutMs;
    // Spring Boot + SQLite schema 初始化冷启动可达数十秒，500ms 轮询
    for (;;) {
      if (await probeHealthOnce(port, 1500)) {
        return true;
      }
      if (!this.child || this.child.exitCode !== null || this.child.signalCode !== null) {
        await this.stop(); // java 进程在就绪前退出（jar 损坏 / 端口绑定失败等），顺手回收 fd
        return false;
      }
      if (Date.now() > deadline) {
        await this.stop();
        return false;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  /** prepare + waitHealthy 的串行便捷入口（诊断/e2e 场景） */
  async start() {
    const decision = await this.prepare();
    if (decision.mode !== 'spawned') {
      return decision;
    }
    const healthy = await this.waitHealthy(decision.port);
    const result = healthy ? decision : { ...decision, mode: 'unhealthy' };
    this.writeStatus(result);
    return result;
  }

  closeLogFd() {
    if (this.logFd !== null) {
      try {
        fs.closeSync(this.logFd);
      } catch {
        /* fd 可能已被内核回收 */
      }
      this.logFd = null;
    }
  }

  /**
   * 停止后端：仅回收自己 spawn 的进程。SIGTERM 触发 Spring shutdown hook
   * （SQLite 正常落盘），5 秒未退出升级 SIGKILL，均为进程组级信号。
   */
  async stop() {
    const child = this.child;
    this.child = null;
    if (!child || !child.pid) {
      this.closeLogFd();
      return;
    }
    const exited = new Promise((resolve) => child.once('exit', resolve));
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* 进程组可能已不存在 */
    }
    const graceful = await Promise.race([exited.then(() => true), new Promise((r) => setTimeout(r, 5000, false))]);
    if (!graceful) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* 同上 */
      }
    }
    this.closeLogFd();
  }
}

module.exports = { BackendManager, probeHealthOnce, isPortFree, getFreePort };
