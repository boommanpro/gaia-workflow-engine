import React from 'react';

import './index.css';
import ReactDOM from 'react-dom/client';

import App from './App';

if (window.__POWERED_BY_WUJIE__) {
    window.__WUJIE_MOUNT = () => {
        // 使用 createRoot API 替代 render
        const props = window.$wujie?.props;
        console.log("无界加载成功-----------")
        console.log(props)
        const wujieRoot = ReactDOM.createRoot(document.getElementById("root")!);

        wujieRoot.render(
            <App/>
        );
    };
    window.__WUJIE_UNMOUNT = () => {
        // 在 React 18 中，不再需要 unmountComponentAtNode
        // 使用 root.unmount() 代替
        const rootElement = document.getElementById("root");
        if (rootElement && rootElement._reactRootContainer) {
            const root = ReactDOM.createRoot(rootElement);
            root.unmount();
        }
    };
} else {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(<App/>); // 移除<React.StrictMode>
}
