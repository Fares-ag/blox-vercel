import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Package } from '@shared/models/package.model';

interface PackagesState {
  list: Package[];
  selected: Package | null;
  loading: boolean;
  error: string | null;
}

const initialState: PackagesState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

const packagesSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {
    setList: (state, action: PayloadAction<Package[]>) => {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelected: (state, action: PayloadAction<Package | null>) => {
      state.selected = action.payload;
    },
    addPackage: (state, action: PayloadAction<Package>) => {
      state.list.push(action.payload);
    },
    updatePackage: (state, action: PayloadAction<Package>) => {
      const index = state.list.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },
    removePackage: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((p) => p.id !== action.payload);
      if (state.selected?.id === action.payload) {
        state.selected = null;
      }
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

export const { setList, setSelected, addPackage, updatePackage, removePackage, setLoading, setError } =
  packagesSlice.actions;
export default packagesSlice.reducer;
