import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Ledger, LedgerFilter } from '@shared/models/ledger.model';

interface LedgersState {
  list: Ledger[];
  filters: LedgerFilter;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: LedgersState = {
  list: [],
  filters: {},
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

const ledgersSlice = createSlice({
  name: 'ledgers',
  initialState,
  reducers: {
    setList: (state, action: PayloadAction<{ ledgers: Ledger[]; total: number }>) => {
      state.list = action.payload.ledgers;
      state.pagination.total = action.payload.total;
      state.loading = false;
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<LedgerFilter>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
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

export const { setList, setFilters, clearFilters, setPage, setLimit, setLoading, setError } = ledgersSlice.actions;
export default ledgersSlice.reducer;
