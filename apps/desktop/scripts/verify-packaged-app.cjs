/**
 * 打包产物启动测试：用 playwright 直启打包后的 Gaia.app 真实二进制
 * （非 node_modules 里的 electron），验证分发形态：app:// 加载、后端拉起、
 * 渲染层健康检查、退出回收 java。
 * 用法：node scripts/verify-packaged-app.cjs [app目录名，默认 mac-arm64]
 * （x64 产物在 Apple Silicon 上经 Rosetta 运行，需已安装 Rosetta）
 */
const { _electron } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ARCH_DIR = process.argv[2] || 'mac-arm64';
const APP_BIN = path.resolve(__dirname, '..', 'out', ARCH_DIR, 'Gaia.app', 'Contents', 'MacOS', 'Gaia');
const JAR_IN_APP = 'Contents/Resources/backend/gaia-workflow-app.jar';

const javaPids = () =>
  new Promise((resolve) => {
    execFile('pgrep', ['-f', JAR_IN_APP], (err, out) => resolve(err ? [] : out.trim().split('\n').filter(Boolean)));
  });

(async () => {
  if (!fs.existsSync(APP_BIN)) {
    throw new Error(`缺少打包产物: ${APP_BIN}`);
  }
  // 清理可能的残留（以 app 内 jar 路径匹配，不动其他 java）
  for (const pid of await javaPids()) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {}
  }

  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'gaia-packaged-'));
  const app = await _electron.launch({
    executablePath: APP_BIN,
    args: [], // 直接以 app bundle 运行（打包形态，无 args）
    env: { ...process.env, GAIA_USER_DATA_DIR: userData, GAIA_E2E: '1' },
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.waitForURL(/^app:\/\/gaia\/(index\.html)?$/, { timeout: 150_000 });
  await page.waitForLoadState('domcontentloaded');

  const status = JSON.parse(fs.readFileSync(path.join(userData, 'backend-status.json'), 'utf-8'));
  console.log('backend-status:', JSON.stringify({ mode: status.mode, port: status.port, pid: status.pid }));

  await page.waitForSelector('#root > *', { timeout: 30_000 });
  console.log('root rendered: true');

  // 菜单栏 Tray 可见性证据（回归：空图导致菜单栏无图标）
  const trayState = (await app.evaluate(() => globalThis.__gaiaDesktopTest?.state?.().tray)) || {};
  console.log('tray:', JSON.stringify(trayState));
  if (!trayState.created || trayState.imageEmpty !== false || !(trayState.width > 0)) {
    throw new Error('菜单栏 Tray 图标断言失败');
  }

  // 用户回归：子路由（新建任务 /chat/new）下品牌 logo 必须可加载
  // （publicPath 曾以 './' 相对解析导致 app://gaia/chat/logo.svg 404）
  const logoProbe = await page.evaluate(async () => {
    const res = await fetch('/logo.svg', { cache: 'no-store' });
    const direct = `${res.status} ${res.headers.get('content-type')}`;
    history.pushState({}, '', '/chat/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await new Promise((r) => setTimeout(r, 1000));
    const img = document.querySelector('img[src$="logo.svg"]');
    const imgOk = img && img.complete && img.naturalWidth > 0;
    return { direct, location: location.pathname, imgOk, imgSrc: img ? img.src : null };
  });
  console.log('logo on sub-route:', JSON.stringify(logoProbe));
  if (logoProbe.direct.split(' ')[0] !== '200' || !logoProbe.imgOk) {
    throw new Error('子路由 logo 加载断言失败');
  }

  const health = await page.evaluate(async () => (await fetch('http://127.0.0.1:48080/api/health')).json());
  console.log('renderer->backend health:', JSON.stringify(health));

  console.log('pageerrors:', errors.length);
  if (status.mode !== 'spawned' || health.status !== 'UP' || errors.length > 0) {
    throw new Error('打包产物启动断言失败');
  }

  await app.close();
  // 等待 java 回收
  const deadline = Date.now() + 15000;
  while ((await javaPids()).length > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }
  const remaining = await javaPids();
  console.log('java 回收:', remaining.length === 0 ? 'OK（无残留）' : `FAIL: ${remaining}`);
  fs.rmSync(userData, { recursive: true, force: true });
  if (remaining.length !== 0) {
    process.exit(1);
  }
  console.log('=== 打包产物启动测试全部通过 ===');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
