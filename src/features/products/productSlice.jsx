import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchProducts = createAsyncThunk(
  "products/fetch",
  async (categoryId = null) => {
    const url = categoryId
      ? `https://api.escuelajs.co/api/v1/categories/${categoryId}/products`
      : "https://api.escuelajs.co/api/v1/products";
    const res = await axios.get(url);
    return res.data;
  }
);

export const createProduct = createAsyncThunk(
  "products/create",
  async (newProduct) => {
    const res = await axios.post(
      "https://api.escuelajs.co/api/v1/products/",
      newProduct
    );
    return res.data;
  }
);

export const updateProduct = createAsyncThunk(
  "products/update",
  async (updateProduct) => {
    const res = await axios.put(
      `https://api.escuelajs.co/api/v1/products/${updateProduct.id}`,
      updateProduct
    );
    return res.data;
  }
);

export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`https://api.escuelajs.co/api/v1/products/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const productSlice = createSlice({
  name: "products",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createProduct.pending, (state) => { state.loading = true; })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(updateProduct.pending, (state) => { state.loading = true; })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.items.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })


      .addCase(deleteProduct.pending, (s) => { s.loading = true; })
      .addCase(deleteProduct.fulfilled, (s, a) => {
        s.loading = false;
        s.items = s.items.filter((p) => p.id !== a.payload);
      })
      .addCase(deleteProduct.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload || a.error.message;
      });
  },
});

export default productSlice.reducer;
