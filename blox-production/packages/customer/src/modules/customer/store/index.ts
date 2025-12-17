import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import applicationReducer from './slices/application.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    application: applicationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

