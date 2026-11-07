/**
 * vitest 全局 setup —— React 18 act() 环境声明。
 * 不设置 IS_REACT_ACT_ENVIRONMENT 时 react-dom/test-utils 的 act 会打
 * "not configured to support act(...)" 警告（本轮要求清零测试告警噪音）。
 */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
