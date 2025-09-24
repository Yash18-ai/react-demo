import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchCourses = createAsyncThunk('courses/fetchCourses', async () => {
    try {
        // const response = await axios.get("http://localhost:5000/courses");
        // const response = await axios.get("http://192.168.1.98:5000/courses");
        const apiBase = process.env.REACT_APP_API_URL || "";
        const url = apiBase ? `${apiBase}/courses` : "/db.json";
        const response = await axios.get(url);

        const data = response.data;
        const courses = Array.isArray(data) ? data : data?.courses ?? [];

        return courses;
    } catch (error) {
        error.response?.data?.message || error.message || "Failed to fetch courses";
        return rejectWithValue(message);
    }
});

const courseSlice = createSlice({
    name: 'courses',
    initialState: {
        courses: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCourses.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCourses.fulfilled, (state, action) => {
                state.loading = false;
                state.courses = action.payload;
            })
            .addCase(fetchCourses.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
})

export default courseSlice.reducer;