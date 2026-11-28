import process from 'node:process';

import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
      server: {
        proxy: {
          '/v1/api': {
            changeOrigin: true,
            target: process.env.GOINGO_API_ORIGIN || 'http://127.0.0.1:8081',
          },
        },
      },
    },
  };
});
