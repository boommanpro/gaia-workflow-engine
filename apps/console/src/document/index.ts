/**
 * document —— 工作流 DSL 单一事实源（headless）
 *
 * 「以 AI 为核心主视角、工作流为最终产物」的地基：
 * AI 读写的是纯 JSON 的 WorkflowDocument，画布只是可选的渲染/精修端。
 */
export * from './types';
export * from './workflow-document';
export * from './normalize-dsl';
export * from './validate';
export * from './layout';
export * from './history';
export * from './store';
export * from './canvas-sync';
export * from './selection';
