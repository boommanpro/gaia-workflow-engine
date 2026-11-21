import { BrowserRouter } from 'react-router-dom';

import ReactDOM from 'react-dom/client';

import './index.css';
import { routeBasename } from './utils/public-path';
import { initThemeMode } from './chat/theme';
import App from './App';
import { bootstrapReplay } from './agent/replay/replay-driver';

// 首屏渲染前应用主题，避免闪白
initThemeMode();

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.width = '100%';
  rootElement.style.height = '100%';
}

// 路由 basename 只取绝对路径前缀（GitHub Pages 子路径）；相对前缀 './'
// （electron app:// 等静态形态）不是路由前缀，见 routeBasename 注释
const basename = routeBasename(process.env.ASSET_PREFIX || '');

const root = ReactDOM.createRoot(rootElement!);
// 回放模式（?replay=<fixture>）必须在 AgentProvider 首个请求发出前激活，
// 否则挂载期并发请求会先打到真实后端 —— bootstrap 完成后再渲染。
// 注：不包 React.StrictMode —— Semi Tooltip 内部使用 findDOMNode（React 18
// StrictMode 下作为 console error 上报，来源在 node_modules 无法应用侧修复）；
// 组件均已按 StrictMode 双调用安全编写（如 initialPrompt 的 peek/take），
// 待 Semi 适配后可恢复包裹。
void bootstrapReplay().finally(() => {
  root.render(
    <BrowserRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  );
});
