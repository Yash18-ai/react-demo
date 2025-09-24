// import { createSlice } from "@reduxjs/toolkit";
// import { nanoid } from "nanoid";

// const initialState = {
//     personal: { firstName: "", lastName: "", email: "" },
//     address: { city: "", zip: "" },
//     images: [],
//     submissions: [],
//     editingId: null,
// };

// const formSlice = createSlice({
//     name: "form",
//     initialState,
//     reducers: {
//         saveStep1(state, action) {
//             state.personal = action.payload;
//         },
//         saveStep2(state, action) {
//             state.address = action.payload;
//             state.images = action.payload.images || []; 
//         },
//         saveImages(state, action) {
//             state.images = action.payload;
//         },
//         startEdit(state, action) {
//             state.editingId = action.payload;
//             const rec = state.submissions.find((s) => s.id === action.payload);
//             if (rec) {
//                 state.personal = rec.personal;
//                 state.address = rec.address;
//                 state.images = rec.images || [];
//             }
//         },
//         cancelEdit(state) {
//             state.editingId = null;
//             state.personal = initialState.personal;
//             state.address = initialState.address;
//             state.images = initialState.images;
//         },
//         deleteSubmission(state, action) {
//             state.submissions = state.submissions.filter((s) => s.id !== action.payload);
//         },
//         finalize(state, action) {
//             if (!Array.isArray(state.submissions)) {
//                 state.submissions = [];
//             }

//             const record = {
//                 id: state.editingId || nanoid(),
//                 personal: state.personal,
//                 address: state.address,
//                 images: state.images,
//                 userId: action.payload,          
//             };


//             if (state.editingId) {
//                 state.submissions = state.submissions.map((s) =>
//                     s.id === state.editingId ? record : s
//                 );
//             } else {
//                 state.submissions.push(record);
//             }
//             state.editingId = null;
//             state.personal = initialState.personal;
//             state.address = initialState.address;
//             state.images = initialState.images;
//         },
//     },
// });

// export const {
//     saveStep1,
//     saveStep2,
//     saveImages,
//     startEdit,
//     cancelEdit,
//     deleteSubmission,
//     finalize,
// } = formSlice.actions;
// export default formSlice.reducer;


import { createSlice } from "@reduxjs/toolkit";
import { nanoid } from "nanoid";

const initialState = {
    personal: { firstName: "", lastName: "", email: "" },
    address: { city: "", zip: "" },
    images: [], // images stored as { id, name, dataUrl }
    submissions: [],
    editingId: null,
};

const formSlice = createSlice({
    name: "form",
    initialState,
    reducers: {
        saveStep1(state, action) {
            state.personal = action.payload;
        },
        // payload: { city, zip }
        saveStep2(state, action) {
            state.address = {
                city: action.payload.city || "",
                zip: action.payload.zip || "",
            };
        },
        // payload: array of { id, name, dataUrl }
        saveImages(state, action) {
            state.images = action.payload || [];
        },
        startEdit(state, action) {
            state.editingId = action.payload;
            const rec = state.submissions.find((s) => s.id === action.payload);
            if (rec) {
                state.personal = rec.personal;
                state.address = rec.address;
                state.images = rec.images || [];
            }
        },
        cancelEdit(state) {
            state.editingId = null;
            state.personal = initialState.personal;
            state.address = initialState.address;
            state.images = initialState.images;
        },
        deleteSubmission(state, action) {
            state.submissions = state.submissions.filter((s) => s.id !== action.payload);
        },
        finalize(state, action) {
            if (!Array.isArray(state.submissions)) {
                state.submissions = [];
            }

            const record = {
                id: state.editingId || nanoid(),
                personal: state.personal,
                address: state.address,
                images: state.images, // persisted dataUrls here
                userId: action.payload,
            };

            if (state.editingId) {
                state.submissions = state.submissions.map((s) =>
                    s.id === state.editingId ? record : s
                );
            } else {
                state.submissions.push(record);
            }

            state.editingId = null;
            state.personal = initialState.personal;
            state.address = initialState.address;
            state.images = initialState.images;
        },
    },
});

export const {
    saveStep1,
    saveStep2,
    saveImages,
    startEdit,
    cancelEdit,
    deleteSubmission,
    finalize,
} = formSlice.actions;
export default formSlice.reducer;
