import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// style.scss
import 'assets/style.css';

// scroll bar
import 'simplebar-react/dist/simplebar.min.css';

// apex-chart
import 'assets/third-party/apex-chart.css';

// map
// mapbox-gl CSS removed as mapbox is not used in TBA frontend

// Fonts loaded via Google Fonts CDN in index.html (Tajawal, Cairo)

// project imports
import App from './App';
import { ConfigProvider } from 'contexts/ConfigContext';
import reportWebVitals from './reportWebVitals';

// Production Console Zero-Noise Policy
import { applyZeroNoisePolicy } from 'utils/consoleNoiseFilter';

// Apply console filters before any other code runs
applyZeroNoisePolicy();

const container = document.getElementById('root');
const root = createRoot(container);

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0 // Live refresh - ensure data is always fresh on mount
    }
  }
});

// ==============================|| MAIN - REACT DOM RENDER ||============================== //

root.render(
  <QueryClientProvider client={queryClient}>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </QueryClientProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
