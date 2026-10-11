import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';
import { initThemeMode } from './chat/theme';
import { bootstrapReplay } from './agent/replay/replay-driver';

// 首屏渲染前应用主题，避免闪白
initThemeMode();

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.width = '100%';
  rootElement.style.height = '100%';
}

// 从 ASSET_PREFIX 推导路由 basename（用于 GitHub Pages 子路径部署）
const assetPrefix: string = process.env.ASSET_PREFIX || '';
const basename = assetPrefix.replace(/\/+$/, '');

const root = ReactDOM.createRoot(rootElement!);
// 回放模式（?replay=<fixture>）必须在 AgentProvider 首个请求发出前激活，
// 否则挂载期并发请求会先打到真实后端 —— bootstrap 完成后再渲染。
void bootstrapReplay().finally(() => {
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});
