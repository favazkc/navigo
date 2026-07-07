import { createSlice } from '@reduxjs/toolkit';

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    current: null,
    loading: false,
    error: null,
  },
  reducers: {
    setProjects(state, action) {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentProject(state, action) {
      state.current = action.payload;
    },
    addProject(state, action) {
      state.list.unshift(action.payload);
    },
    updateProject(state, action) {
      const idx = state.list.findIndex((p) => p._id === action.payload._id);
      if (idx !== -1) state.list[idx] = action.payload;
      if (state.current?._id === action.payload._id) state.current = action.payload;
    },
    removeProject(state, action) {
      state.list = state.list.filter((p) => p._id !== action.payload);
      if (state.current?._id === action.payload) state.current = null;
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

export const {
  setProjects,
  setCurrentProject,
  addProject,
  updateProject,
  removeProject,
  setLoading,
  setError,
} = projectsSlice.actions;
export default projectsSlice.reducer;
