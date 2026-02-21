import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_URL = env.VITE_APP_BASE_NAME || '/';
  const API_BASE_URL = env.VITE_API_URL || 'http://localhost:8080/api';
  const PORT = 3000;

  return {
    base: API_URL,
    // Force host to localhost and disable auto open to avoid external preview links (Codespaces previews)
    server: {
      open: false,
      port: PORT,
      host: 'localhost',
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    preview: {
      open: false,
      host: 'localhost'
    },
    define: {
      global: 'window' // Only if you need it for legacy packages
    },
    resolve: {
      alias: {
        '@ant-design/icons': path.resolve(__dirname, 'node_modules/@ant-design/icons')
      }
    },
    plugins: [react(), tsconfigPaths()],

    optimizeDeps: {
      include: ['@mui/material/Tooltip', 'react', 'react-dom', 'react-router-dom']
    },
    build: {
      chunkSizeWarningLimit: 1000, // Raise warning limit to 1000kb
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('exceljs')) return 'vendor-excel';

              // Split MUI into smaller chunks
              if (id.includes('@mui/x-date-pickers')) return 'vendor-mui-date';
              if (id.includes('@mui/x-data-grid')) return 'vendor-mui-grid';
              if (id.includes('@mui/icons-material')) return 'vendor-mui-icons';
              if (id.includes('@mui/material')) return 'vendor-mui-core';

              // Charts
              if (id.includes('chart') || id.includes('apexcharts') || id.includes('recharts')) return 'vendor-charts';

              // React Core
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) return 'vendor-react';

              // Utils
              if (id.includes('axios')) return 'vendor-axios';
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'vendor-dates';
              if (id.includes('lodash') || id.includes('formik') || id.includes('yup')) return 'vendor-utils';

              // Other Libs
              if (id.includes('jspdf') || id.includes('html5-qrcode') || id.includes('zxcvbn')) return 'vendor-libs';
            }
          }
        }
      }
    }
  };
});
