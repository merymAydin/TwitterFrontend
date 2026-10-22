import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import tweetsReducer from "./slices/tweetsSlice";
import usersReducer from "./slices/usersSlice";
import interactionsReducer from "./slices/interactionsSlice";
import commentsReducer from "./slices/commentsSlice";
import followersReducer from "./slices/followersSlice";
import subscriptionReducer from "./slices/subscriptionSlice";
import notificationsReducer from "./slices/notificationsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tweets: tweetsReducer,
    users: usersReducer,
    interactions: interactionsReducer,
    comments: commentsReducer,
    followers: followersReducer,
    subscription: subscriptionReducer,
    notifications: notificationsReducer,
  },
});

export const RootState = store.getState;
export const AppDispatch = store.dispatch;
