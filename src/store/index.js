import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import tweetsReducer from "./slices/tweetsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tweets: tweetsReducer,
  },
});

export const RootState = store.getState;
export const AppDispatch = store.dispatch;
