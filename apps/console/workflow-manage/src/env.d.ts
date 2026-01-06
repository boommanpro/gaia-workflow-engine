/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHILD_APP_URL: string
  readonly VITE_WORKFLOW_EDITOR_URL: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}