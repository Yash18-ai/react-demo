import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchUsers = createAsyncThunk("users/fetchUsers", async () => {
    try {
        const res = await axios.get("https://randomuser.me/api/?results=10");
        return res.data.results.map(u => ({
            ...u,
            id: { ...u.id, value: u.id?.value || u.login.uuid }, 
            isFavorite: false
        }));
    } catch (error) {
        console.error(error);
        throw error;
    }
});


const userSlice = createSlice({
    name: "users",
    initialState: {
        users: [], loading: false, Error: null, filter: "all"
    },
    reducers: {
        deleteUser: (state, { payload }) => {
            state.users = state.users.filter(u => u.id.value !== payload);
        },
        toggleFavorite: (state, { payload }) => {
            const u = state.users.find(x => x.id.value === payload);
            if (u) u.isFavorite = !u.isFavorite;
        },
        setFilter: (state, { payload }) => {
            state.filter = payload;
        },
        updateUser: (state, { payload }) => {
            const i = state.users.findIndex(u => u.id.value === payload.id);
            if (i > -1) {
                state.users[i] = {
                    ...state.users[i],
                    name: payload.name,
                    email: payload.email,
                };
            }
        }
    },
    extraReducers: builder => {
        builder
            .addCase(fetchUsers.pending, state => {
                state.loading = true; state.Error = null;
            })
            .addCase(fetchUsers.fulfilled, (state, { payload }) => {
                state.loading = false; state.users = payload;
            })
            .addCase(fetchUsers.rejected, (state, { error }) => {
                state.loading = false; state.Error = error.message;
            });
    }
});

export const {
    deleteUser,
    toggleFavorite,
    setFilter,
    updateUser
} = userSlice.actions;
export default userSlice.reducer;
