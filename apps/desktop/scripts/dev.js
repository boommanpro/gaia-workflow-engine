/**
 * dev 模式编排：起 console rsbuild dev server（3111，与 console e2e 同端口习惯），
 * 就绪后以 GAIA_DEV_SERVER_URL 启动 Electron；Ctrl-C 一并回收两个进程。
 *
 * 后端仍走 backend-manager（dev 模式端口固定 48080，/api 由 rsbuild proxy 转发）；
 * 纯前端联调可 GAIA_SKIP_BACKEND=1 pnpm dev。
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 3111;
const CONSOLE_DIR = path.resolve(__dirname, '..', '..', 'console');

const waitForServer = (url, timeoutMs) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`dev server 未在 ${timeoutMs}ms 内就绪: ${url}`));
        } else {
          setTimeout(tick, 500);
        }
      });
    };
    tick();
  });

const main = async () => {
  const rsbuildBin = path.join(CONSOLE_DIR, 'node_modules', '.bin', 'rsbuild');
  const rsbuild = spawn(rsbuildBin, ['dev', '--port', String(PORT)], {
    cwd: CONSOLE_DIR,
    stdio: 'inherit',
  });

  let electron = null;
  const shutdown = () => {
    for (const child of [electron, rsbuild]) {
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  rsbuild.on('exit', () => shutdown());

  try {
    await waitForServer(`http://127.0.0.1:${PORT}/`, 120_000);
  } catch (err) {
    console.error(err.message);
    shutdown();
  }

  electron = spawn(path.join(__dirname, '..', 'node_modules', '.bin', 'electron'), ['.'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, GAIA_DEV_SERVER_URL: `http://127.0.0.1:${PORT}` },
  });
  electron.on('exit', (code) => {
    // Electron 退出后连 rsbuild 一起收尾
    shutdown();
    process.exitCode = code ?? 0;
  });
};

main();
