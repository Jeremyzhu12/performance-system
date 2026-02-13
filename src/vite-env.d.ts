/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COZE_API_KEY: string
  readonly VITE_COZE_WORKFLOW_ID: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}