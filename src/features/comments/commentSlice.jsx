import { createSlice, nanoid } from "@reduxjs/toolkit";

const commentSlice = createSlice({
  name: "comments",
  initialState: {
    byProduct: {}
  },
  reducers: {
    addComment: {
      reducer(state, action) {
        const { productId, parentId, id, text, createdAt } = action.payload;
        if (!state.byProduct[productId]) {
          state.byProduct[productId] = [];
        }
        state.byProduct[productId].push({ id, parentId, text, createdAt });
      },
      prepare({ productId, parentId, text }) {
        return {
          payload: {
            productId,
            parentId: parentId || null,
            text,
            id: nanoid(),
            createdAt: new Date().toISOString()
          }
        };
      }
    }
  }
});

export const { addComment } = commentSlice.actions;
export default commentSlice.reducer;
