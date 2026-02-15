import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import jsconfigPaths from 'vite-jsconfig-paths';
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
        '@ant-design/icons': path.resolve(__dirname, 'node_modules/@ant-design/icons'),
        'api': path.resolve(__dirname, 'src/api'),
        'assets': path.resolve(__dirname, 'src/assets'),
        'components': path.resolve(__dirname, 'src/components'),
        'config': path.resolve(__dirname, 'src/config'),
        'constants': path.resolve(__dirname, 'src/constants'),
        'contexts': path.resolve(__dirname, 'src/contexts'),
        'data': path.resolve(__dirname, 'src/data'),
        'hooks': path.resolve(__dirname, 'src/hooks'),
        'layout': path.resolve(__dirname, 'src/layout'),
        'locales': path.resolve(__dirname, 'src/locales'),
        'menu-items': path.resolve(__dirname, 'src/menu-items'),
        'metrics': path.resolve(__dirname, 'src/metrics'),
        'pages': path.resolve(__dirname, 'src/pages'),
        'providers': path.resolve(__dirname, 'src/providers'),
        'routes': path.resolve(__dirname, 'src/routes'),
        'sections': path.resolve(__dirname, 'src/sections'),
        'services': path.resolve(__dirname, 'src/services'),
        'store': path.resolve(__dirname, 'src/store'),
        'themes': path.resolve(__dirname, 'src/themes'),
        'utils': path.resolve(__dirname, 'src/utils')
      }
    },
    plugins: [react(), jsconfigPaths()],

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