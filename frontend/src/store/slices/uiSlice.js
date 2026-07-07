import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'ts_theme';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    themeMode: localStorage.getItem(THEME_KEY) || 'light',
    snackbar: { open: false, message: '', severity: 'info' },
    globalLoading: false,
  },
  reducers: {
    toggleTheme(state) {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, state.themeMode);
    },
    setTheme(state, action) {
      state.themeMode = action.payload;
      localStorage.setItem(THEME_KEY, action.payload);
    },
    showSnackbar(state, action) {
      state.snackbar = { open: true, ...action.payload };
    },
    closeSnackbar(state) {
      state.snackbar = { ...state.snackbar, open: false };
    },
    setGlobalLoading(state, action) {
      state.globalLoading = action.payload;
    },
  },
});

export const { toggleTheme, setTheme, showSnackbar, closeSnackbar, setGlobalLoading } =
  uiSlice.actions;
export default uiSlice.reducer;
