'use strict';

const { app: electronApp, screen } = require('electron');
const { logger } = require('ee-core/log');
const { getConfig } = require('ee-core/config');
const { getMainWindow } = require('ee-core/electron');
const { crossService } = require('../service/cross');
const { isDev, isProd, getBaseDir,getPublicDir } = require('ee-core/ps');
const { BrowserWindow } = require('electron');
const path = require('path');

class Lifecycle {


  /**
   * core app have been loaded
   */
  async ready() {
    logger.info('[lifecycle] ready');

    if (isProd) {
      logger.info('[lifecycle] starting gaia-workflow server in prod mode...');
      try {
        logger.info('[lifecycle] creating gaia-workflow server...');
        await crossService.createGaiaWorkflowServer();
        logger.info('[lifecycle] gaia-workflow server started command sent');
      } catch (error) {
        logger.error('[lifecycle] failed to start gaia-workflow server:', error);
      }
    } else {
      logger.info('[lifecycle] dev mode - backend server will not auto-start');
    }
  }



  /**
   * check if backend server is ready
   */
  async checkBackendReady(maxAttempts = 60, interval = 1000) {
    const port = 48080;
    const net = require('net');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const isReady = await new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(1000);

          socket.on('connect', () => {
            socket.destroy();
            resolve(true);
          });

          socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
          });

          socket.on('error', (err) => {
            socket.destroy();
            resolve(false);
          });

          socket.connect(port, '127.0.0.1');
        });

        if (isReady) {
          logger.info('[lifecycle] backend server is ready');
          return true;
        }
      } catch (error) {
        // ignore
      }
      logger.info(`[lifecycle] waiting for backend server... (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    logger.warn('[lifecycle] backend server may not be ready, proceeding anyway');
    return false;
  }

  /**
   * electron app ready
   */
  async electronAppReady() {
    logger.info('[lifecycle] electron-app-ready');

    // When double clicking the icon, display the opened window
    electronApp.on('second-instance', () => {
      const win = getMainWindow();
      if (win.isMinimized()) {
        win.restore();
      }
      win.show();
      win.focus();
    });
  }

  /**
   * main window have been loaded
   */
  async windowReady() {
    logger.info('[lifecycle] window-ready');

    // Create a separate loading window
    const loadingPagePath = path.join(getPublicDir(), '/html/loading.html');

    // Calculate loading window size (smaller than main window)
    const mainScreen = screen.getPrimaryDisplay();
    const { width, height } = mainScreen.workAreaSize;
    const loadingWindowWidth = 300;
    const loadingWindowHeight = 200;
    const loadingX = Math.floor((width - loadingWindowWidth) / 2);
    const loadingY = Math.floor((height - loadingWindowHeight) / 2);

    // Create loading window
    const loadingWin = new BrowserWindow({
      width: loadingWindowWidth,
      height: loadingWindowHeight,
      x: loadingX,
      y: loadingY,
      resizable: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    // Load the loading page
    loadingWin.loadFile(loadingPagePath);
    loadingWin.show();

    // Check if backend server is ready
    const isBackendReady = await this.checkBackendReady();

    if (isBackendReady) {
      // Backend is ready, close loading window and show main window
      loadingWin.close();

      // Now configure the main window normally
      const win = getMainWindow();

      // The window is centered and scaled proportionally
      // Obtain the size information of the main screen, calculate the width and height of the window as a percentage of the screen,
      // and calculate the coordinates of the upper left corner when the window is centered
      const windowWidth = Math.floor(width * 0.8);
      const windowHeight = Math.floor(height * 0.8);
      const x = Math.floor((width - windowWidth) / 2);
      const y = Math.floor((height - windowHeight) / 2);
      win.setBounds({ x, y, width: windowWidth, height: windowHeight });

      // Refresh the main window to load the actual application
      win.reload();
      win.show();
      win.focus();
    } else {
      logger.warn('[lifecycle] Backend server is not ready, keeping loading window open');

      // Optionally, after some time, force close loading and open main window
      setTimeout(() => {
        if (!loadingWin.isDestroyed()) {
          loadingWin.close();

          // Show main window anyway
          const win = getMainWindow();
          const windowWidth = Math.floor(width * 0.8);
          const windowHeight = Math.floor(height * 0.8);
          const x = Math.floor((width - windowWidth) / 2);
          const y = Math.floor((height - windowHeight) / 2);
          win.setBounds({ x, y, width: windowWidth, height: windowHeight });
          win.reload();
          win.show();
          win.focus();
        }
      }, 10000); // Close loading after 10 seconds and force load main window
    }
  }

  /**
   * before app close
   */
  async beforeClose() {
    logger.info('[lifecycle] before-close');

    // 关闭后端服务
    logger.info('[lifecycle] stopping gaia-workflow server...');
    try {
      // Kill the gaia-workflow server by name
      await crossService.killServer('java', 'javaapp');
      logger.info('[lifecycle] gaia-workflow server stopped');
    } catch (error) {
      logger.error('[lifecycle] failed to stop gaia-workflow server:', error);
    }
  }
}
Lifecycle.toString = () => '[class Lifecycle]';

module.exports = {
  Lifecycle
};
