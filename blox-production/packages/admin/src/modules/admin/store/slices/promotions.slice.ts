import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Promotion } from '@shared/models/promotion.model';

interface PromotionsState {
  list: Promotion[];
  selected: Promotion | null;
  loading: boolean;
  error: string | null;
}

const initialState: PromotionsState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

const promotionsSlice = createSlice({
  name: 'promotions',
  initialState,
  reducers: {
    setList: (state, action: PayloadAction<Promotion[]>) => {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelected: (state, action: PayloadAction<Promotion | null>) => {
      state.selected = action.payload;
    },
    addPromotion: (state, action: PayloadAction<Promotion>) => {
      state.list.push(action.payload);
    },
    updatePromotion: (state, action: PayloadAction<Promotion>) => {
      const index = state.list.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },
    removePromotion: (state, action: PayloadAction<string>) => {
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

export const {
  setList,
  setSelected,
  addPromotion,
  updatePromotion,
  removePromotion,
  setLoading,
  setError,
} = promotionsSlice.actions;
export default promotionsSlice.reducer;
