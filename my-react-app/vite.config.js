import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://127.0.0.1:3000'

  return {
    envDir: '..',
    server: {
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
