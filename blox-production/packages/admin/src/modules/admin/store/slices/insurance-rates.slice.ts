import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { InsuranceRate } from '@shared/models/insurance-rate.model';

interface InsuranceRatesState {
  list: InsuranceRate[];
  selected: InsuranceRate | null;
  loading: boolean;
  error: string | null;
}

const initialState: InsuranceRatesState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

const insuranceRatesSlice = createSlice({
  name: 'insuranceRates',
  initialState,
  reducers: {
    setList: (state, action: PayloadAction<InsuranceRate[]>) => {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelected: (state, action: PayloadAction<InsuranceRate | null>) => {
      state.selected = action.payload;
    },
    addInsuranceRate: (state, action: PayloadAction<InsuranceRate>) => {
      state.list.push(action.payload);
    },
    updateInsuranceRate: (state, action: PayloadAction<InsuranceRate>) => {
      const index = state.list.findIndex((ir) => ir.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },
    removeInsuranceRate: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((ir) => ir.id !== action.payload);
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

export const {
  setList,
  setSelected,
  addInsuranceRate,
  updateInsuranceRate,
  removeInsuranceRate,
  setLoading,
  setError,
} = insuranceRatesSlice.actions;
export default insuranceRatesSlice.reducer;

