// client/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './tasksSlice';
import authReducer from './authSlice';
import projectsReducer from './projectsSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    auth: authReducer,
    projects: projectsReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
