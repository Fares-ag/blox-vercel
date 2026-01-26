import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loggingService } from '@shared/services/logging.service'
import { initWebVitals } from '@shared/utils/web-vitals'
import App from './App.tsx'

// Initialize error tracking
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.MODE || 'development';
const release = import.meta.env.VITE_APP_VERSION || undefined;

if (sentryDsn) {
  loggingService.init(sentryDsn, environment, release);
}

// Initialize Web Vitals tracking
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
