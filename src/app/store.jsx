import { configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";
import { combineReducers } from "redux";

import teamReducer from "../features/team/teamSlice";
import productReducer from "../features/products/productSlice";
import formReducer from "../features/form/formSlice";
import userReducer from "../features/user/userSlice";
import authReducer from "../features/auth/authSlice";
import commentReducer from "../features/comments/commentSlice";
import categoryReducer from "../features/categories/categorySlice";
import courseReducer from "../features/courses/courseSlice";
import videoreducer from "../features/videos/videoSlice";
import usersReducer from "../features/users/usersSlice";
import messageReducer from "../features/messages/messagesSlice";
import { initSocket } from '../services/socket';

const persistConfig = {
  key: "root",
  storage,
};

const rootReducer = combineReducers({
  team: teamReducer,
  products: productReducer,
  users: userReducer,
  form: formReducer,
  comments: commentReducer,
  auth: authReducer,
  categories: categoryReducer,
  courses: courseReducer,
  videos: videoreducer,
  usersData: usersReducer,
  messages: messageReducer,
});

// const rootReducer = (state, action) => {
//   if (action.type === "auth/logout") {
//     storage.removeItem("persist:root"); // clear persisted data
//     state = undefined; // reset redux store state
//   }
//   return appReducer(state, action);
// };

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

initSocket(store);

export const persistor = persistStore(store);
