import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchCategories = createAsyncThunk("categories/fetch", async () => {
    const response = await axios.get("https://api.escuelajs.co/api/v1/categories")
    return response.data;
});

const categorySlice = createSlice({
    name: "categories",
    initialState: {
        items: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
        .addCase(fetchCategories.pending, (state) => {
            state.loading = true;
        })
        .addCase(fetchCategories.fulfilled, (state,action) => {
            state.loading = false;
            state.items = action.payload;
        })
        .addCase(fetchCategories.rejected, (state,action) => {
            state.loading = false;
            state.error = action.error.message;
        });
    }
});

export default categorySlice.reducer;

