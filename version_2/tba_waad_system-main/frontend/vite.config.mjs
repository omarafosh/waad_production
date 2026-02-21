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
      host: 'localhost'
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
        // Add more aliases as needed
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
              // Split ExcelJS into its own chunk
              if (id.includes('exceljs')) {
                return 'excel';
              }
              // Split Material UI into its own chunk
              if (id.includes('@mui')) {
                return 'mui';
              }
              // Split Charting libraries
              if (id.includes('chart') || id.includes('apexcharts') || id.includes('recharts')) {
                return 'charts';
              }
              // Split core React vendor
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor';
              }
            }
          }
        }
      }
    }
  };
});