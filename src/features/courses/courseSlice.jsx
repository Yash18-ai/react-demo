// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";


// const options = {
    
//     method: 'POST',
//     url: 'https://udemy-api2.p.rapidapi.com/v1/udemy/course-details/%7Bcourse_name%7D',
//     headers: {
//         'x-rapidapi-key': '3c1e2b4630msh65127e5a2929309p1c680bjsn06a6f454e7d6',
//         'x-rapidapi-host': 'udemy-api2.p.rapidapi.com',
//         'Content-Type': 'application/json'
//     },
//     data: {
//         locale: 'en_US',
//         include_sections: true,
//         include_lectures: true
//     }
// };

// // export const fetchCourses = createAsyncThunk('courses/fetchCourses', async () => {
// //     const response = await axios.request(options);
// //     console.log(response.data)
// //     return response.data
// // })

// export const fetchCourses = createAsyncThunk('courses/fetchCourses', async () => {
//     const courseName = '100-days-of-code'; 
//     const url = `https://udemy-api2.p.rapidapi.com/v1/udemy/course-details/${courseName}`;

//     const options = {
//         method: 'POST',
//         url: url,
//         headers: {
//             'x-rapidapi-key': '3c1e2b4630msh65127e5a2929309p1c680bjsn06a6f454e7d6',
//             'x-rapidapi-host': 'udemy-api2.p.rapidapi.com',
//             'Content-Type': 'application/json'
//         },
//         data: {
//             locale: 'en_US',
//             include_sections: true,
//             include_lectures: true
//         }
//     };

//     const response = await axios.request(options);

//     return [response.data.data];
// });

// const courseSlice = createSlice({
//     name: 'courses',
//     initialState: {
//         courses: [],
//         loading: false,
//         error: null,
//     },
//     reducers: {},
//     extraReducers: (builder) => {
//         builder
//             .addCase(fetchCourses.pending, (state) => {
//                 state.loading = true;
//             })
//             .addCase(fetchCourses.fulfilled, (state, action) => {
//                 state.loading = false;
//                 state.courses = action.payload;
//             })
//             .addCase(fetchCourses.rejected, (state, action) => {
//                 state.loading = false;
//                 state.error = action.error.message;
//             });
//     }
// })

// export default courseSlice.reducer;


import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const fetchCourses = createAsyncThunk('courses/fetchCourses', async() => {
    try{
        // const response = await axios.get("http://localhost:5000/courses");
        const response = await axios.get("http://192.168.1.98:5000/courses");
        return response.data;
    }catch(error){
        console.error(error);
        throw error;
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
            .addCase(fetchCourses.fulfilled, (state,action) => {
                state.loading = false;
                state.courses = action.payload;
            })
            .addCase(fetchCourses.rejected, (state,action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
})

export default courseSlice.reducer;