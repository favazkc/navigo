import { createSlice } from '@reduxjs/toolkit';

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    setTasks(state, action) {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    addTask(state, action) {
      state.list.push(action.payload);
    },
    updateTask(state, action) {
      const idx = state.list.findIndex((t) => t._id === action.payload._id);
      if (idx !== -1) state.list[idx] = action.payload;
    },
    removeTask(state, action) {
      state.list = state.list.filter((t) => t._id !== action.payload);
    },
    reorderTasks(state, action) {
      // Replace optimistically with new list
      state.list = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setTasks, addTask, updateTask, removeTask, reorderTasks, setLoading, setError } =
  tasksSlice.actions;
export default tasksSlice.reducer;
