import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.width = '100%';
  rootElement.style.height = '100%';
}

// 从 ASSET_PREFIX 推导路由 basename（用于 GitHub Pages 子路径部署）
const assetPrefix: string = process.env.ASSET_PREFIX || '';
const basename = assetPrefix.replace(/\/+$/, '');

const root = ReactDOM.createRoot(rootElement!);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
