/**
 * Gaia 桌面版主进程入口。
 *
 * 形态：
 * · prod（打包后 / electron .）：app:// 协议加载 extraResources/frontend，内嵌 jar 自动拉起
 * · dev（GAIA_DEV_SERVER_URL=...）：加载 console rsbuild dev server，/api 由其 proxy 转发 48080
 * · GAIA_SKIP_BACKEND=1：跳过后端（纯前端联调 / e2e dev-renderer 模式）
 * · GAIA_USER_DATA_DIR=...：覆盖用户数据目录（e2e 隔离用）
 * · --hidden：开机自启的后台形态 —— 只拉后端不开窗口（菜单栏/点击 dock 图标唤起）
 *
 * 后台常驻（macOS 惯例）：关闭窗口不退出，后端继续服务；经 dock 图标点击、
 * dock 菜单或菜单栏 Tray 重新打开窗口；Cmd+Q / 菜单「退出 Gaia」才真正退出
 * （will-quit 回收后端进程）。
 *
 * 启动时序：registerAppScheme（ready 前）→ prepare 后端（决定端口，即 preload 注入参数）
 * → 创建隐藏窗口 + splash → waitHealthy → 加载正式页面 → ready-to-show 后显示。
 * 后端不可用时给出明确对话框，应用仍可加载（前端 ServerConfigGuard 引导配置远程地址）。
 */

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');

const { registerAppScheme, createAppProtocol, APP_INDEX_URL } = require('./protocol');
const { BackendManager } = require('./backend-manager');
const { DEFAULT_PORT, buildApiBase } = require('./backend-core');
const { createTray } = require('./tray');

const devServerUrl = process.env.GAIA_DEV_SERVER_URL || '';
const skipBackend = process.env.GAIA_SKIP_BACKEND === '1';
const isDev = !!devServerUrl;
// e2e 环境：失败对话框改为直接加载页面（模态框会阻塞无头断言），失败证据看 backend-status.json
const isE2E = process.env.GAIA_E2E === '1';
// 开机自启（登录项带 --hidden 参数）拉起的后台形态
const startHidden = process.argv.includes('--hidden');

// ---- 用户数据目录隔离：e2e 显式指定；dev 追加 -dev 后缀，不污染正式数据 ----
if (process.env.GAIA_USER_DATA_DIR) {
  app.setPath('userData', process.env.GAIA_USER_DATA_DIR);
} else if (isDev && !app.isPackaged) {
  app.setPath('userData', `${app.getPath('userData')}-dev`);
}

// privileged scheme 声明必须发生在 app ready 之前
registerAppScheme();

// ---- 单实例：二次启动只聚焦已有窗口 ----
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openMainWindow());
}

const frontendDir = () =>
  app.isPackaged ? path.join(process.resourcesPath, 'frontend') : path.join(__dirname, '..', 'frontend-dist');
const jarPath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'gaia-workflow-app.jar')
    : path.join(__dirname, '..', 'backend', 'gaia-workflow-app.jar');
const trayIconPath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'build', 'tray-template.png')
    : path.join(__dirname, '..', 'build', 'tray-template.png');

let mainWindow = null;
let backend = null;
let tray = null;
let quitCleaned = false;
let isQuitting = false;
let startupSettled = false; // 初始启动流程结束（此后重开窗口直接加载正式页）
let apiBaseOverride = null; // 后端落在非默认端口时的 preload 注入参数
let lastBackendPort = null; // Tray 状态展示用

const createWindow = (preloadArgs) => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false, // 先 splash，正式页 ready-to-show 后再显示，避免白屏闪烁
    backgroundColor: '#0f1117',
    title: 'Gaia',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      additionalArguments: preloadArgs,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show());
  // 兜底：ready-to-show 丢失（崩溃重载等）时 8 秒后强制显示
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 8000);

  // 外链一律走系统浏览器，不在壳内开新窗
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  // 只允许 app://（prod）与 dev server（dev）内导航，其余转系统浏览器
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const trusted = url.startsWith('app://') || (devServerUrl && url.startsWith(devServerUrl));
    if (!trusted) {
      event.preventDefault();
      if (/^https?:/.test(url)) {
        shell.openExternal(url);
      }
    }
  });
  // 关窗 = 隐藏（macOS 常驻应用惯例，如 Slack/Discord）：配合后台常驻，
  // 重开窗口是瞬时 show 而非整页重载（前端约 6MB JS，重载要 1~2 秒且丢状态）；
  // 真正退出走 app.quit()（before-quit 置位后放行 close）
  mainWindow.on('close', (event) => {
    if (!isQuitting && !mainWindow.isDestroyed()) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const loadMainPage = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.loadURL(isDev ? devServerUrl : APP_INDEX_URL);
};

/** 打开（或聚焦）主窗口：dock 点击 / Tray / 二次启动 / activate 共用入口 */
const openMainWindow = () => {
  if (!startupSettled) {
    return; // 初始启动流程未收尾（含 --hidden 冷启动），start() 自己管理建窗节奏
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  createWindow(apiBaseOverride ? [`--gaia-api-base=${apiBaseOverride}`] : []);
  // 启动已收尾：后端状态已定，直接加载正式页（此前失败过的场景由前端
  // ServerConfigGuard 引导配置远程地址）
  loadMainPage();
};

// ---- 开机自启（登录项）----
const loginItemSupported = () => app.isPackaged; // dev 下注册的是裸 electron 二进制，启动行为无意义
const getAutoLaunch = () => loginItemSupported() && app.getLoginItemSettings().openAtLogin;
const setAutoLaunch = (on) => {
  if (!loginItemSupported()) {
    if (!isE2E) {
      dialog.showMessageBox({
        type: 'info',
        message: '登录项仅在打包后的 Gaia.app 中可用',
        detail: '开发模式下运行的是未打包的 electron 二进制，注册登录项没有意义。',
        buttons: ['好'],
      });
    }
    return false;
  }
  // --hidden：登录后只拉后端不开窗口（真正的后台自启）
  app.setLoginItemSettings({ openAtLogin: on, args: on ? ['--hidden'] : [] });
  if (tray) {
    tray.refresh();
  }
  return true;
};

const backendLabel = () => {
  if (skipBackend) {
    return '未启用（跳过后端）';
  }
  if (backend && lastBackendPort) {
    return `运行中 · 端口 ${lastBackendPort}`;
  }
  return '未运行';
};

const readStatusFile = () => {
  try {
    const fs = require('fs');
    const file = path.join(app.getPath('userData'), 'backend-status.json');
    if (fs.existsSync(file)) {
      return fs.readFileSync(file, 'utf-8');
    }
  } catch {
    /* 读取失败按无状态处理 */
  }
  return null;
};

const buildMenu = () => {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: '开机自启动（后台）',
          type: 'checkbox',
          checked: getAutoLaunch(),
          click: (menuItem) => {
            const ok = setAutoLaunch(menuItem.checked);
            if (!ok) {
              menuItem.checked = false;
            }
          },
        },
        { type: 'separator' },
        { role: 'hide', label: '隐藏 Gaia' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '全部显示' },
        { type: 'separator' },
        { role: 'quit', label: '退出 Gaia' },
      ],
    },
    { role: 'editMenu', label: '编辑' },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    { role: 'windowMenu', label: '窗口' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const setupDockMenu = () => {
  if (process.platform !== 'darwin' || !app.dock) {
    return;
  }
  app.dock.setMenu(
    Menu.buildFromTemplate([
      { label: '打开主窗口', click: () => openMainWindow() },
      { type: 'separator' },
      { label: '退出 Gaia', click: () => app.quit() },
    ])
  );
};

const setupTray = () => {
  if (process.platform !== 'darwin') {
    return; // Windows 托盘后续需要专门图标形态，暂不启用
  }
  tray = createTray(trayIconPath(), {
    onOpenMain: () => openMainWindow(),
    onQuit: () => app.quit(),
    backendLabel,
    getAutoLaunch,
    setAutoLaunch,
  });
};

/** 无 JDK 21+：引导下载；仍可继续（前端引导配置远程后端地址） */
const handleNoJava = () => {
  if (isE2E) {
    console.error('[gaia-desktop][e2e] no-java：跳过对话框直接加载前端');
    loadMainPage();
    return;
  }
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: 'warning',
    title: '需要 Java 运行环境',
    message: '未找到 Java 21 或更高版本',
    detail:
      'Gaia 桌面版内置后端服务，运行与「代码节点」现场编译均需要 JDK 21+。\n' +
      '也可以选择继续，稍后在前端配置页指向一个已运行的远程后端地址。',
    buttons: ['打开 Java 下载页', '继续（连接远程后端）', '退出'],
    defaultId: 0,
    noLink: true,
  });
  if (choice === 0) {
    shell.openExternal('https://adoptium.net/temurin/releases/?version=21');
    loadMainPage();
  } else if (choice === 1) {
    loadMainPage();
  } else {
    app.quit();
  }
};

/** 启动失败类（端口冲突 / spawn 失败 / 健康超时）：给出日志入口 */
const handleBackendFailure = (mode) => {
  if (isE2E) {
    console.error(`[gaia-desktop][e2e] backend failure: ${mode}，跳过对话框直接加载前端`);
    loadMainPage();
    return;
  }
  const reasons = {
    'port-conflict': '48080 端口被非 Gaia 进程占用（开发模式下端口固定，无法自动切换）。',
    unhealthy: '后端进程启动超时或提前退出（初始化失败、jar 损坏等）。',
  };
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: 'error',
    title: '后端启动失败',
    message: `后端启动失败（${mode}）`,
    detail: `${reasons[mode] || '未知原因'}\n诊断日志：${path.join(app.getPath('userData'), 'logs', 'backend.log')}`,
    buttons: ['打开日志目录', '继续（连接远程后端）', '退出'],
    defaultId: 0,
    noLink: true,
  });
  if (choice === 0) {
    shell.openPath(path.join(app.getPath('userData'), 'logs'));
    loadMainPage();
  } else if (choice === 1) {
    loadMainPage();
  } else {
    app.quit();
  }
};

const start = async () => {
  await app.whenReady();
  buildMenu();
  setupDockMenu();
  createAppProtocol(frontendDir());
  setupTray();

  if (skipBackend) {
    // 纯前端形态（e2e dev-renderer / 前端联调）：后端由外部保证或不需要
    startupSettled = true;
    if (!startHidden) {
      openMainWindow();
    }
    return;
  }

  backend = new BackendManager({
    jarPath: jarPath(),
    dataDir: path.join(app.getPath('userData'), 'data'),
    logDir: path.join(app.getPath('userData'), 'logs'),
    statusFile: path.join(app.getPath('userData'), 'backend-status.json'),
    allowFallbackPort: !isDev,
  });

  // prepare 在建窗前完成：其端口决策决定 preload 的 apiBaseUrl 注入参数
  const decision = await backend.prepare();
  if (decision.port && decision.port !== DEFAULT_PORT) {
    apiBaseOverride = buildApiBase(decision.port);
  }
  lastBackendPort = decision.port;

  // --hidden：不建窗口（后端照样拉起；Tray/dock 可随时唤起窗口）
  if (!startHidden) {
    createWindow(apiBaseOverride ? [`--gaia-api-base=${apiBaseOverride}`] : []);
    await mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  }

  if (decision.mode === 'reused') {
    startupSettled = true;
    if (mainWindow) {
      loadMainPage();
    }
    return;
  }
  if (decision.mode === 'no-java') {
    startupSettled = true;
    openMainWindow(); // 后台形态也要让用户看到引导（否则无从知晓缺 JDK）
    handleNoJava();
    return;
  }
  if (decision.mode !== 'spawned') {
    startupSettled = true;
    openMainWindow();
    handleBackendFailure(decision.mode);
    return;
  }

  const healthy = await backend.waitHealthy(decision.port);
  startupSettled = true;
  if (tray) {
    tray.refresh();
  }
  if (healthy) {
    if (mainWindow) {
      loadMainPage();
    }
  } else if (mainWindow) {
    handleBackendFailure('unhealthy');
  } else {
    openMainWindow();
    handleBackendFailure('unhealthy');
  }
};

// ---- 生命周期 ----
// 退出前置位：放行窗口 close（平时关窗只是隐藏）
app.on('before-quit', () => {
  isQuitting = true;
});
// e2e 钩子：验证 --hidden 形态下「菜单栏/dock 唤起窗口」路径（仅测试环境暴露）
let activateCount = 0;
if (isE2E) {
  globalThis.__gaiaDesktopTest = {
    openMainWindow: () => openMainWindow(),
    state: () => ({
      startupSettled,
      activateCount,
      windows: require('electron').BrowserWindow.getAllWindows().length,
      // 菜单栏图标可见性证据：tray 存在、图非空、有宽度（空图是上一版不可见的根因）
      tray: tray
        ? { created: true, imageEmpty: tray.image.isEmpty(), width: tray.getBounds().width }
        : { created: false },    }),
  };
}
// macOS 惯例：关窗 ≠ 退出。后端继续在后台服务，Tray/dock 常驻；
// 其他平台保持「关窗即退出」（当前也只分发 mac 包）。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // dock 图标点击：无窗口时重新打开
  activateCount += 1;
  openMainWindow();
});

app.on('will-quit', (event) => {
  if (quitCleaned) {
    return;
  }
  quitCleaned = true;
  event.preventDefault();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  const cleanup = backend ? backend.stop() : Promise.resolve();
  cleanup.finally(() => app.exit(0));
});

start();
