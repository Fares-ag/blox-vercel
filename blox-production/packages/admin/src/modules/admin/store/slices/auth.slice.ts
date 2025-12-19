import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@shared/models/user.model';
import { authService } from '@shared/services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean; // Track if auth has been initialized
  error: string | null;
}

const initialState: AuthState = {
  user: authService.getUserSync(),
  token: authService.getTokenSync(),
  isAuthenticated: authService.isAuthenticatedSync(),
  loading: false,
  initialized: false, // Start as false, will be set to true after AuthInitializer runs
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.initialized = true; // Mark as initialized when credentials are set
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.initialized = true; // Mark as initialized even on logout
      state.error = null;
    },
    setInitialized: (state) => {
      state.initialized = true; // Allow manual initialization flag
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { setCredentials, setLoading, setError, logout, clearError, setInitialized } = authSlice.actions;
export default authSlice.reducer;
