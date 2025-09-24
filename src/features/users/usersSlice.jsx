import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { getDecryptedToken } from "../auth/authSlice";

export const fetchUsers = createAsyncThunk("users/fetchAll", async (_, { rejectWithValue }) => {
    try {
        const token = getDecryptedToken();
        const res = await axios.get("https://api.escuelajs.co/api/v1/users", {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    } catch (err) {
        return rejectWithValue(err.response?.data || err.message);
    }
});

const usersSlice = createSlice({
    name: "usersData",
    initialState: { 
        users: [], 
        loading: false, 
        error: null 
    },
    extraReducers: builder => {
        builder
            .addCase(fetchUsers.pending, state => { state.loading = true; })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export default usersSlice.reducer;
