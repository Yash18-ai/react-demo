import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchTeam = createAsyncThunk("team/fetchTeam", async () => {
    try{
        const response = await axios.get("https://dummyjson.com/users");
        return response.data.users;
    }catch(error){
        console.error(error);
        throw error;
    }
});

const teamSlice = createSlice({
    name: "team",
    initialState: {
        members: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.members = action.payload;
            })
            .addCase(fetchTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    },
});

export default teamSlice.reducer;
