/**
 * 用 Electron 离屏窗口把 build/icon.svg 渲染为 1024px PNG（保留透明通道）。
 * qlmanage 缩略图会烘焙不透明白底，无法用于圆角图标，故走 Chromium 渲染。
 * 用法：electron scripts/render-icon-electron.js <svg> <out.png> <size>
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const [, , svgPath, outPath, sizeArg] = process.argv;
const size = Number(sizeArg) || 1024;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: size,
    height: size,
    show: false,
    useContentSize: true,
    transparent: true, // 保留 SVG 圆角外的透明区域（否则被窗口底色合成成不透明）
    webPreferences: { offscreen: true },
  });
  const svg = fs.readFileSync(svgPath, 'utf8').replace(
    '<svg ',
    `<svg style="width:${size}px;height:${size}px;display:block" `
  );
  await win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`<body style="margin:0;background:transparent">${svg}</body>`)}`
  );
  // 等 Chromium 完成布局与绘制（无网络资源，短等待足够）
  await new Promise((r) => setTimeout(r, 400));
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, image.toPNG());
  app.exit(0);
});
