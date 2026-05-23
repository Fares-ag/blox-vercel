import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Application } from '@shared/models/application.model';

interface ApplicationState {
  list: Application[];
  selected: Application | null;
  loading: boolean;
  error: string | null;
}

const initialState: ApplicationState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

const applicationSlice = createSlice({
  name: 'application',
  initialState,
  reducers: {
    setApplications: (state, action: PayloadAction<Application[]>) => {
      state.list = action.payload;
    },
    setSelected: (state, action: PayloadAction<Application | null>) => {
      state.selected = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setApplications, setSelected, setLoading, setError } = applicationSlice.actions;
export default applicationSlice.reducer;

