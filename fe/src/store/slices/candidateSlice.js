import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  applications: [],
  savedJobs: [],
  isLoading: false,
  error: null,
};

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    setApplications: (state, action) => {
      state.applications = action.payload;
    },
    addApplication: (state, action) => {
      state.applications.unshift(action.payload);
    },
    setSavedJobs: (state, action) => {
      state.savedJobs = action.payload;
    },
    addSavedJob: (state, action) => {
      if (!state.savedJobs.find(job => job.id === action.payload.id)) {
        state.savedJobs.push(action.payload);
      }
    },
    removeSavedJob: (state, action) => {
      state.savedJobs = state.savedJobs.filter(job => job.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setProfile,
  setApplications,
  addApplication,
  setSavedJobs,
  addSavedJob,
  removeSavedJob,
  setLoading,
  setError,
  clearError,
} = candidateSlice.actions;

export default candidateSlice.reducer;
