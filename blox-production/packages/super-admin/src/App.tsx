import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { store } from './modules/super-admin/store';
import { theme } from '@shared/config/theme';
import { AppRoutes } from './modules/super-admin/routes/AppRoutes';
import { Loading } from '@shared/components';
import { ErrorBoundary } from '@shared/components';
import { ScrollToTop } from '@shared/components/shared/ScrollToTop/ScrollToTop';
import { AuthInitializer } from './modules/super-admin/components/AuthInitializer/AuthInitializer';
import '@shared/styles/global.scss';
import './App.scss';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <ScrollToTop />
            <AuthInitializer />
            <Box className="super-admin-app-wrapper">
              <Suspense fallback={<Loading fullScreen message="Loading..." />}>
                <AppRoutes />
              </Suspense>
              <ToastContainer
                position="bottom-center"
                autoClose={10000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
              />
            </Box>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
