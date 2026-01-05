import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  postedJobs: [],
  applications: [],
  isLoading: false,
  error: null,
};

const recruiterSlice = createSlice({
  name: 'recruiter',
  initialState,
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    setPostedJobs: (state, action) => {
      state.postedJobs = action.payload;
    },
    addPostedJob: (state, action) => {
      state.postedJobs.unshift(action.payload);
    },
    updatePostedJob: (state, action) => {
      const index = state.postedJobs.findIndex(job => job.id === action.payload.id);
      if (index !== -1) {
        state.postedJobs[index] = action.payload;
      }
    },
    removePostedJob: (state, action) => {
      state.postedJobs = state.postedJobs.filter(job => job.id !== action.payload);
    },
    setApplications: (state, action) => {
      state.applications = action.payload;
    },
    updateApplicationStatus: (state, action) => {
      const { applicationId, status } = action.payload;
      const application = state.applications.find(app => app.id === applicationId);
      if (application) {
        application.status = status;
      }
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
  setPostedJobs,
  addPostedJob,
  updatePostedJob,
  removePostedJob,
  setApplications,
  updateApplicationStatus,
  setLoading,
  setError,
  clearError,
} = recruiterSlice.actions;

export default recruiterSlice.reducer;
