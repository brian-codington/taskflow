// client/src/store/tasksSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../api/client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  position: number;
  assigneeId?: string;
  sprintId?: string;
  projectId: string;
}

interface TasksState {
  items: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  loading: false,
  error: null
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async (projectId: string) => {
    const res = await api.get(`/projects/${projectId}/tasks`);
    return res.data;
  }
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async ({ projectId, data }: { projectId: string; data: Partial<Task> }) => {
    const res = await api.post(`/projects/${projectId}/tasks`, data);
    return res.data;
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    taskUpdated(state, action: PayloadAction<{ taskId: string; changes: Partial<Task> }>) {
      const task = state.items.find(t => t.id === action.payload.taskId);
      if (task) Object.assign(task, action.payload.changes);
    },
    taskCreated(state, action: PayloadAction<Task>) {
      state.items.push(action.payload);
    },
    taskDeleted(state, action: PayloadAction<string>) {
      state.items = state.items.filter(t => t.id !== action.payload);
    },
    taskReordered(state, action: PayloadAction<{ taskId: string; newPosition: number; newStatus: string }>) {
      const task = state.items.find(t => t.id === action.payload.taskId);
      if (task) {
        task.position = action.payload.newPosition;
        task.status = action.payload.newStatus as Task['status'];
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchTasks.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? 'Failed to load tasks'; })
      .addCase(createTask.fulfilled, (state, action) => { state.items.push(action.payload); });
  }
});

export const { taskUpdated, taskCreated, taskDeleted, taskReordered } = tasksSlice.actions;
export default tasksSlice.reducer;
