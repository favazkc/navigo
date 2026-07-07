import { createSlice } from '@reduxjs/toolkit';

const membersSlice = createSlice({
  name: 'members',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    setMembers(state, action) {
      state.list = action.payload;
      state.loading = false;
      state.error = null;
    },
    removeMember(state, action) {
      state.list = state.list.filter((m) => m.user._id !== action.payload);
    },
    updateMemberRole(state, action) {
      const { userId, role } = action.payload;
      const member = state.list.find((m) => m.user._id === userId);
      if (member) member.role = role;
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

export const { setMembers, removeMember, updateMemberRole, setLoading, setError } =
  membersSlice.actions;
export default membersSlice.reducer;
