import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  // 性能优化配置
  build: {
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd'],
          'vendor-utils': ['dayjs', 'xlsx']
        }
      }
    },
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除console.log
        drop_debugger: true
      }
    },
    // 启用源码映射（开发环境）
    sourcemap: process.env.NODE_ENV === 'development'
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'dayjs', 'xlsx'],
    exclude: ['better-sqlite3']
  }
})