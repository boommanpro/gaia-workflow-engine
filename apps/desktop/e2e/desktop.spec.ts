/**
 * 桌面版 Electron E2E（三模式，见 playwright.config.ts 注释）。
 *
 * 断言口径与主进程实现一一对应：
 * · backend-status.json（main/backend-manager.js writeStatus）是进程决策的落盘证据
 * · java 进程回收用 pgrep -f <jar 绝对路径> 断言（只匹配我们的 jar，不误伤其他 java）
 * · Worker 兼容性：monaco 在构建产物里以同源 chunk URL 构造 Worker
 *   （static/js/NNN.hash.js），app:// 协议必须允许 —— 用真实 chunk 构造 Worker 验证
 */
import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
import { spawn, execFile } from 'child_process';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';

const DESKTOP_DIR = __dirname + '/..';
const JAR_PATH = path.join(DESKTOP_DIR, 'backend', 'gaia-workflow-app.jar');
const FRONTEND_DIST = path.join(DESKTOP_DIR, 'frontend-dist');
const CONSOLE_DIR = path.resolve(DESKTOP_DIR, '..', 'console');
const DEV_PORT = 3111;

const javaPids = (): Promise<string[]> =>
  new Promise((resolve) => {
    execFile('pgrep', ['-f', JAR_PATH], (err, stdout) => resolve(err ? [] : stdout.trim().split('\n').filter(Boolean)));
  });

/** 轮询直到条件为真，超时抛错（比 expect.waitFor 的错误信息更直接） */
const waitUntil = async (fn: () => Promise<boolean>, timeoutMs: number, what: string) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await fn()) {
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(`等待超时（${timeoutMs}ms）: ${what}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
};

/** HTTP 探活 /api/health（默认 48080） */
const probeHealth = (port = 48080) =>
  new Promise<boolean>((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
  });

const killStrayJavas = async () => {
  for (const pid of await javaPids()) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      /* 已退出 */
    }
  }
};

const collectPageErrors = (page: Page, errors: string[]) => {
  page.on('pageerror', (err) => errors.push(String(err)));
};

/** 从前端产物中挑一个真实 JS chunk，用于 Worker 协议兼容性验证 */
const anyChunk = () => {
  const dir = path.join(FRONTEND_DIST, 'static', 'js');
  const file = fs.readdirSync(dir).find((f) => f.endsWith('.js'));
  if (!file) {
    throw new Error('frontend-dist/static/js 下没有 JS chunk');
  }
  return `app://gaia/static/js/${file}`;
};

const requireAssets = () => {
  expect(fs.existsSync(JAR_PATH), '缺少 backend/gaia-workflow-app.jar，先跑 pnpm prepare:assets').toBeTruthy();
  expect(fs.existsSync(path.join(FRONTEND_DIST, 'index.html')), '缺少 frontend-dist，先跑 pnpm prepare:assets').toBeTruthy();
};

// ---------------------------------------------------------------------------
// b) 全栈：生产形态 —— app:// 协议 + 内嵌 jar 自动拉起（最重，放最前，
//    避免 dev-renderer 场景的 rsbuild 进程影响 java 进程计数断言）
// ---------------------------------------------------------------------------
test('full-stack: app:// 加载前端 + 自动拉起后端 + 退出无残留', async () => {
  requireAssets();
  await killStrayJavas(); // 前置：确保 48080 空闲，走进 spawn 分支
  expect(await javaPids()).toEqual([]);

  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-e2e-full-'));
  const electronApp: ElectronApplication = await _electron.launch({
    args: ['.'],
    cwd: DESKTOP_DIR,
    env: { ...process.env, GAIA_USER_DATA_DIR: userData, GAIA_E2E: '1' },
  });
  const page = await electronApp.firstWindow();
  const pageErrors: string[] = [];
  collectPageErrors(page, pageErrors);

  // splash → 正式页（Spring Boot 冷启动最长 90s + 缓冲）
  // 根路径 app://gaia/（/index.html 不是已定义路由，见 protocol.js 注释）
  await page.waitForURL(/^app:\/\/gaia\/(index\.html)?$/, { timeout: 150_000 });
  await page.waitForLoadState('domcontentloaded');

  // 后端决策证据：spawn 模式、默认端口
  const statusFile = path.join(userData, 'backend-status.json');
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
  expect(status.mode).toBe('spawned');
  expect(status.port).toBe(48080);
  expect(status.pid).toBeTruthy();

  // 只拉起了一个后端进程
  expect(await javaPids()).toHaveLength(1);

  // 前端真实渲染（非 splash）
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 30_000 });
  await expect(page.locator('.wrap')).toHaveCount(0); // splash 容器已不在

  // 渲染层可直连后端（CORS 全开放，HealthController /api/health）
  const health = await page.evaluate(async () => {
    const res = await fetch('http://127.0.0.1:48080/api/health');
    return res.json();
  });
  expect(health.status).toBe('UP');

  // SPA 路由 fallback：无扩展名路由返回 index.html（BrowserRouter 接管）
  const routeStatus = await page.evaluate(async () => {
    const res = await fetch('app://gaia/admin/workflows');
    return { status: res.status, body: await res.text() };
  });
  expect(routeStatus.status).toBe(200);
  expect(routeStatus.body).toContain('<div id="root">');

  // 静态资源命中 + 404 语义（带扩展名缺失资源）
  expect((await page.evaluate(() => fetch('app://gaia/logo.svg').then((r) => r.status)))).toBe(200);
  expect((await page.evaluate(() => fetch('app://gaia/no-such-file.ico').then((r) => r.status)))).toBe(404);

  // Worker 协议兼容：monaco 以同源 chunk URL 构造 Worker，app:// 必须允许
  // （同步抛 TypeError = 协议拒绝 worker；构造成功即协议支持，脚本内容无关）
  const workerOk = await page.evaluate((url) => {
    try {
      const w = new Worker(url);
      w.terminate();
      return true;
    } catch {
      return false;
    }
  }, anyChunk());
  expect(workerOk, 'app:// 源下 new Worker 同源脚本应被允许').toBe(true);

  // 页面无未捕获异常
  expect(pageErrors).toEqual([]);

  // 退出：electronApp.close() → will-quit → backend.stop()，java 应被整组回收
  await electronApp.close();
  await waitUntil(async () => (await javaPids()).length === 0, 15_000, '退出后 java 进程回收');

  fs.rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// b2) 后台常驻：关闭窗口不退出（macOS 惯例），后端继续服务；显式 quit 才回收
// ---------------------------------------------------------------------------
test('background: 关闭窗口后应用与后端常驻，app.quit 才退出', async () => {
  requireAssets();
  await killStrayJavas();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-e2e-bg-'));
  const electronApp = await _electron.launch({
    args: ['.'],
    cwd: DESKTOP_DIR,
    env: { ...process.env, GAIA_USER_DATA_DIR: userData, GAIA_E2E: '1' },
  });
  const page = await electronApp.firstWindow();
  await page.waitForURL(/^app:\/\/gaia\/(index\.html)?$/, { timeout: 150_000 });
  await waitUntil(() => probeHealth(), 30_000, '后端就绪');

  // 关闭窗口 = 隐藏（macOS 常驻惯例）：无可见窗口、应用与后端继续运行。
  // 先进入子路由：重开若发生整页重载，URL 会被打回根路径 —— 这是断言「零成本重开」的依据
  await page.evaluate(() => {
    history.pushState({}, '', '/chat/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(1000);
  await electronApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows().forEach((w) => w.close());
  });
  await waitUntil(
    async () =>
      (await electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().every((w) => !w.isVisible())))
    ,
    10_000,
    '窗口全部隐藏'
  );

  // 应用进程与后端都应存活
  expect(electronApp.process().exitCode).toBeNull();
  await waitUntil(() => probeHealth(), 5_000, '关窗后后端仍在服务');
  expect((await javaPids()).length).toBe(1);

  // 重开窗口：瞬时 show，不重载页面（URL 不变，无需重新等待加载）
  const urlBefore = page.url();
  await electronApp.evaluate(() => globalThis.__gaiaDesktopTest.openMainWindow());
  await waitUntil(
    async () => (await electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.isVisible()))),
    5_000,
    '重开窗口可见'
  );
  await page.waitForTimeout(300);
  expect(page.url()).toBe(urlBefore); // 未重载（重载会先回到 splash/app://gaia/ 根路径）

  // 菜单栏图标证据：Tray 已创建、图非空、有宽度
  // （回归：曾因 createFromBuffer 误传 raw 位图得到空图，菜单栏不显示图标）
  const trayState = (await electronApp.evaluate(() => globalThis.__gaiaDesktopTest.state())).tray;
  expect(trayState.created).toBe(true);
  expect(trayState.imageEmpty).toBe(false);
  expect(trayState.width).toBeGreaterThan(0);

  // 显式退出（等价菜单「退出 Gaia」/ Cmd+Q）→ 后端整组回收
  await electronApp.evaluate(({ app }) => app.quit());
  await electronApp.close();
  await waitUntil(async () => (await javaPids()).length === 0, 15_000, '退出后 java 回收');
  fs.rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// b3) --hidden：开机自启的后台形态 —— 不开窗口，后端照常拉起，可唤起窗口
// ---------------------------------------------------------------------------
test('hidden: --hidden 启动无窗口，后端照常运行且可唤起窗口', async () => {
  requireAssets();
  await killStrayJavas();
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-e2e-hidden-'));
  const electronApp = await _electron.launch({
    args: ['.', '--hidden'],
    cwd: DESKTOP_DIR,
    env: { ...process.env, GAIA_USER_DATA_DIR: userData, GAIA_E2E: '1' },
  });

  // 后端在无窗口状态下被拉起并就绪
  const statusFile = path.join(userData, 'backend-status.json');
  await waitUntil(
    () => Promise.resolve(fs.existsSync(statusFile)),
    60_000,
    'backend-status.json 生成'
  );
  await waitUntil(() => probeHealth(), 150_000, 'hidden 模式后端健康');
  const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
  expect(status.mode).toBe('spawned');

  // 全程无窗口
  let windowCount = await electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
  expect(windowCount).toBe(0);

  // 唤起路径（菜单栏/点击 dock 图标的等价入口）。
  // 主进程的 waitHealthy 轮询可能晚于测试探活置位 startupSettled，重试调用直到窗口出现
  await waitUntil(
    async () => {
      await electronApp.evaluate(() => globalThis.__gaiaDesktopTest?.openMainWindow());
      return (await electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)) > 0;
    },
    20_000,
    '唤起主窗口'
  );
  const page = await electronApp.firstWindow();
  await page.waitForURL(/^app:\/\/gaia\/(index\.html)?$/, { timeout: 30_000 });

  await electronApp.evaluate(({ app }) => app.quit());
  await electronApp.close();
  await waitUntil(async () => (await javaPids()).length === 0, 15_000, '退出后 java 回收');
  fs.rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// c) 复用：外部已有 Gaia 后端（同 jar）时不重复 spawn，退出也不杀外部进程
// ---------------------------------------------------------------------------
test('reuse: 已有后端时复用，退出不杀外部进程', async () => {
  requireAssets();
  await killStrayJavas();

  const externalData = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-e2e-reuse-data-'));
  const external = spawn('java', ['-jar', JAR_PATH], {
    cwd: externalData,
    stdio: 'ignore',
    detached: true,
  });
  // 等外部后端就绪
  await waitUntil(() => probeHealth(), 120_000, '外部后端就绪');

  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-e2e-reuse-'));
  const electronApp = await _electron.launch({
    args: ['.'],
    cwd: DESKTOP_DIR,
    env: { ...process.env, GAIA_USER_DATA_DIR: userData, GAIA_E2E: '1' },
  });
  const page = await electronApp.firstWindow();
  await page.waitForURL(/^app:\/\/gaia\/(index\.html)?$/, { timeout: 150_000 });

  const status = JSON.parse(fs.readFileSync(path.join(userData, 'backend-status.json'), 'utf-8'));
  expect(status.mode).toBe('reused');
  expect(status.pid).toBeNull();

  // 退出后外部 java 必须仍存活
  await electronApp.close();
  const pids = await javaPids();
  expect(pids.length).toBeGreaterThanOrEqual(1);

  // 清理外部后端（进程组）
  try {
    process.kill(-external.pid, 'SIGTERM');
  } catch {
    /* 已退出 */
  }
  await waitUntil(async () => (await javaPids()).length === 0, 15_000, '外部后端清理').catch(() => {
    try {
      process.kill(-external.pid, 'SIGKILL');
    } catch {
      /* ignore */
    }
  });
  fs.rmSync(externalData, { recursive: true, force: true });
  fs.rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// a) dev-renderer：rsbuild dev server + 跳过后端，纯前端形态
// ---------------------------------------------------------------------------
test('dev-renderer: dev server 模式加载前端', async () => {
  expect(fs.existsSync(path.join(CONSOLE_DIR, 'node_modules')), 'console 依赖未安装').toBeTruthy();

  // 起 rsbuild dev（若 3111 已被占用则复用）
  let reusedExisting = false;
  try {
    const res = await fetch(`http://127.0.0.1:${DEV_PORT}/`);
    reusedExisting = res.ok;
  } catch {
    reusedExisting = false;
  }
  const rsbuild = reusedExisting
    ? null
    : spawn(path.join(CONSOLE_DIR, 'node_modules', '.bin', 'rsbuild'), ['dev', '--port', String(DEV_PORT)], {
        cwd: CONSOLE_DIR,
        stdio: 'ignore',
      });
  if (rsbuild) {
    const deadline = Date.now() + 120_000;
    for (;;) {
      try {
        const res = await fetch(`http://127.0.0.1:${DEV_PORT}/`);
        if (res.ok) {
          break;
        }
      } catch {
        /* 还没起来 */
      }
      if (Date.now() > deadline) {
        rsbuild.kill('SIGTERM');
        throw new Error('rsbuild dev 120s 未就绪');
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  const electronApp = await _electron.launch({
    args: ['.'],
    cwd: DESKTOP_DIR,
    env: {
      ...process.env,
      GAIA_DEV_SERVER_URL: `http://127.0.0.1:${DEV_PORT}`,
      GAIA_SKIP_BACKEND: '1',
    },
  });
  const page = await electronApp.firstWindow();
  const pageErrors: string[] = [];
  collectPageErrors(page, pageErrors);

  await page.waitForURL(new RegExp(`http://127\\.0\\.0\\.1:${DEV_PORT}/`), { timeout: 30_000 });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 30_000 });
  expect(pageErrors).toEqual([]);

  await electronApp.close();
  if (rsbuild) {
    rsbuild.kill('SIGTERM');
  }
});
