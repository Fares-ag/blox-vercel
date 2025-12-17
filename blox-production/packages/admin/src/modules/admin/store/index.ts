import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import dashboardReducer from './slices/dashboard.slice';
import applicationsReducer from './slices/applications.slice';
import productsReducer from './slices/products.slice';
import offersReducer from './slices/offers.slice';
import promotionsReducer from './slices/promotions.slice';
import packagesReducer from './slices/packages.slice';
import ledgersReducer from './slices/ledgers.slice';
import insuranceRatesReducer from './slices/insurance-rates.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    applications: applicationsReducer,
    products: productsReducer,
    offers: offersReducer,
    promotions: promotionsReducer,
    packages: packagesReducer,
    ledgers: ledgersReducer,
    insuranceRates: insuranceRatesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
