/**
 * macOS 菜单栏（Tray）托管入口：常驻状态图标 + 快捷菜单。
 * 「后台运行托管」的可视面：关窗后应用仍在（后端继续服务），从这里可重新
 * 打开主窗口、切换开机自启、查看后端状态、彻底退出。
 *
 * 图标为构建期生成的模板图（build/tray-template.png，黑色 G + 透明底，
 * 专为 16pt 小尺寸加粗设计，见 build/tray-template.svg），运行时只做加载：
 * · createFromPath 支持 asar 内路径
 * · createFromBitmap(raw, {scaleFactor:2}) 把 32px 数据标记为 16pt@2x
 *   （注意：createFromBuffer 只接受 PNG/JPEG 编码数据，传 raw 位图会得到空图——
 *    这是第一版菜单栏图标不可见的根因，勿改回）
 * · setTemplateImage(true) 让系统按明暗主题自动染色
 */

const { Tray, Menu, nativeImage } = require('electron');

const buildTemplateImage = (pngPath) => {
  const source = nativeImage.createFromPath(pngPath);
  if (source.isEmpty()) {
    throw new Error(`无法读取菜单栏模板图: ${pngPath}`);
  }
  const { width, height } = source.getSize();
  const image = nativeImage.createFromBitmap(source.toBitmap(), {
    width,
    height,
    scaleFactor: width >= 32 ? 2 : 1, // 32px -> 16pt@2x（retina 清晰，1x 自动降采样）
  });
  if (image.isEmpty()) {
    throw new Error(`菜单栏模板图位图转换失败: ${pngPath}`);
  }
  image.setTemplateImage(true);
  return image;
};

/**
 * @param {string} iconPngPath 模板图 png 路径（asar 内亦可）
 * @param {object} handlers
 * @param {() => void} handlers.onOpenMain 打开主窗口
 * @param {() => void} handlers.onQuit 退出应用
 * @param {() => string} handlers.backendLabel 后端状态文案（如「运行中 · 端口 48080」）
 * @param {() => boolean} handlers.getAutoLaunch 当前开机自启状态
 * @param {(on: boolean) => boolean} handlers.setAutoLaunch 设置开机自启，返回是否成功
 */
const createTray = (iconPngPath, handlers) => {
  const image = buildTemplateImage(iconPngPath);
  const tray = new Tray(image);
  tray.setToolTip('Gaia');

  const rebuild = () => {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: '打开主窗口', click: handlers.onOpenMain },
        { label: `后端：${handlers.backendLabel()}`, enabled: false },
        { type: 'separator' },
        {
          label: '开机自启动（后台）',
          type: 'checkbox',
          checked: handlers.getAutoLaunch(),
          click: (menuItem) => {
            const ok = handlers.setAutoLaunch(menuItem.checked);
            if (!ok) {
              menuItem.checked = false;
            }
            rebuild();
          },
        },
        { type: 'separator' },
        { label: '退出 Gaia', click: handlers.onQuit },
      ])
    );
  };

  // macOS：左键点击菜单栏图标直接唤起主窗口（菜单仍可通过点击箭头/右键展开）
  tray.on('click', handlers.onOpenMain);
  rebuild();
  // image/getBounds 一并返回：Tray 实例没有取图 API（Electron 45 无 getImage），可见性断言用
  return {
    refresh: rebuild,
    destroy: () => tray.destroy(),
    image,
    getBounds: () => tray.getBounds(),
  };
};

module.exports = { createTray, buildTemplateImage };
