import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Offer } from '@shared/models/offer.model';

interface OffersState {
  list: Offer[];
  selected: Offer | null;
  loading: boolean;
  error: string | null;
}

const initialState: OffersState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {
    setList: (state, action: PayloadAction<Offer[]>) => {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelected: (state, action: PayloadAction<Offer | null>) => {
      state.selected = action.payload;
    },
    addOffer: (state, action: PayloadAction<Offer>) => {
      state.list.push(action.payload);
    },
    updateOffer: (state, action: PayloadAction<Offer>) => {
      const index = state.list.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },
    removeOffer: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((o) => o.id !== action.payload);
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

export const { setList, setSelected, addOffer, updateOffer, removeOffer, setLoading, setError } = offersSlice.actions;
export default offersSlice.reducer;
