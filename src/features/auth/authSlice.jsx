import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";

const SECRET_KEY = 's#2k8vG@qyJ$7Bd5rLcT!hN*X6zPeA4oFw9MuRtDnE3iSbYxVgWmCfHpQjZu1O';

export const getDecryptedToken = () => {
    const encryptedToken = Cookies.get('auth_token');
    if (!encryptedToken) return null;

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedToken, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || null;
    } catch {
        return null;
    }
};

const signupApi = async ({ name, email, password }) => {
    const res = await axios.post("https://api.escuelajs.co/api/v1/users/", {
        name,
        email,
        password,
        avatar: "https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg"
    });
    return res.data;
};

const loginApi = async ({ email, password }) => {
    const res = await axios.post("https://api.escuelajs.co/api/v1/auth/login", {
        email,
        password
    });
    return res.data;
};


export const signup = createAsyncThunk('auth/signup', async (payload, { rejectWithValue }) => {
    try {
        return await signupApi(payload);
    } catch (err) {
        return rejectWithValue(err.response?.data || err.message);
    }
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
    try {
        const { access_token } = await loginApi(payload);

        const encryptedToken = CryptoJS.AES.encrypt(access_token, SECRET_KEY).toString();
        Cookies.set("auth_token", encryptedToken, { expires: 1 });

        const profileRes = await axios.get("https://api.escuelajs.co/api/v1/auth/profile", {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        return {
            access_token,
            user: profileRes.data
        };
    } catch (err) {
        return rejectWithValue(err.response?.data || err.message);
    }
});


const initialState = {
    user: null,
    loading: false,
    error: null
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.error = null;
            Cookies.remove("auth_token");
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: builder => {
        builder
            .addCase(signup.pending, (state) => {
                state.loading = true;
            })
            .addCase(signup.fulfilled, (state) => {
                state.error = null;
            })
            .addCase(signup.rejected, (state, action) => {
                state.error = action.payload;
            })
            .addCase(login.pending, (state) => {
                state.loading = true;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.user = action.payload;
                // state.user = action.payload.user;
                state.error = null;
            
                const encryptedToken = CryptoJS.AES.encrypt(
                    action.payload.access_token,
                    SECRET_KEY
                ).toString();
            
                Cookies.set("auth_token", encryptedToken, { expires: 1 });
            })
            
            .addCase(login.rejected, (state, action) => {
                state.error = action.payload;
            });
    }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;

