import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { DashboardStats, DateRange } from '@shared/models/dashboard.model';

interface DashboardState {
  stats: DashboardStats | null;
  filters: DateRange | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  stats: null,
  filters: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setStats: (state, action: PayloadAction<DashboardStats>) => {
      state.stats = action.payload;
      state.loading = false;
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<DateRange>) => {
      state.filters = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setStats, setFilters, setLoading, setError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
