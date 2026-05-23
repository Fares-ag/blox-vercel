import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Product, ProductFilter } from '@shared/models/product.model';

interface ProductsState {
  list: Product[];
  selected: Product | null;
  filters: ProductFilter;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: ProductsState = {
  list: [],
  selected: null,
  filters: {},
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setList: (state, action: PayloadAction<{ products: Product[]; total: number }>) => {
      state.list = action.payload.products;
      state.pagination.total = action.payload.total;
      state.loading = false;
      state.error = null;
    },
    setSelected: (state, action: PayloadAction<Product | null>) => {
      state.selected = action.payload;
    },
    setFilters: (state, action: PayloadAction<ProductFilter>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = {};
      state.pagination.page = 1;
    },
    addProduct: (state, action: PayloadAction<Product>) => {
      state.list.unshift(action.payload);
      state.pagination.total += 1;
    },
    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.list.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },
    removeProduct: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter((p) => p.id !== action.payload);
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
  setFilters,
  clearFilters,
  addProduct,
  updateProduct,
  removeProduct,
  setPage,
  setLimit,
  setLoading,
  setError,
} = productsSlice.actions;
export default productsSlice.reducer;
