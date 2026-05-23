import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Application } from '@shared/models/application.model';

interface ApplicationsState {
  list: Application[];
  selected: Application | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: ApplicationsState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setList: (state, action: PayloadAction<{ applications: Application[]; total: number }>) => {
      state.list = action.payload.applications;
      state.pagination.total = action.payload.total;
      state.loading = false;
      state.error = null;
    },
    setSelected: (state, action: PayloadAction<Application | null>) => {
      state.selected = action.payload;
    },
    addApplication: (state, action: PayloadAction<Application>) => {
      state.list.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateApplication: (state, action: PayloadAction<Application>) => {
      const index = state.list.findIndex((app) => app.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },
    removeApplication: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((app) => app.id !== action.payload);
      state.pagination.total -= 1;
      if (state.selected?.id === action.payload) {
        state.selected = null;
      }
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
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

export const {
  setList,
  setSelected,
  addApplication,
  updateApplication,
  removeApplication,
  setPage,
  setLimit,
  setLoading,
  setError,
} = applicationsSlice.actions;
export default applicationsSlice.reducer;
