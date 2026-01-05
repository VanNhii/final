const express = require('express');
const {
  getCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  getCandidateProfile,
  updateCandidateProfile,
  getCandidateApplications,
  getCandidateInterviews,
  searchJobs,
  getCandidateDashboard,
  getCandidateNotifications,
  // Experience management
  getCandidateExperiences,
  addCandidateExperience,
  updateCandidateExperience,
  deleteCandidateExperience,
  // Education management
  getCandidateEducations,
  addCandidateEducation,
  updateCandidateEducation,
  deleteCandidateEducation,
  // Skill management
  getCandidateSkills,
  addCandidateSkill,
  updateCandidateSkill,
  deleteCandidateSkill,
  // Job application management
  applyForJob,
  withdrawApplication,
  getSavedJobs,
  saveJob,
  unsaveJob
} = require('../controllers/candidateController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes below require authentication

// Candidate-specific routes (must come before parameterized routes)
router.get('/profile', authorize('candidate'), getCandidateProfile);
router.put('/profile', authorize('candidate'), updateCandidateProfile);

router.get('/dashboard', authorize('candidate'), getCandidateDashboard);
router.get('/applications', authorize('candidate'), getCandidateApplications);
router.get('/interviews', authorize('candidate'), getCandidateInterviews);
router.get('/jobs/search', authorize('candidate'), searchJobs);
router.get('/notifications/unread-count', authorize('candidate'), async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    const count = await Notification.countDocuments({ 
      user_id: req.user.id, 
      is_read: false 
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
});
router.get('/notifications', authorize('candidate'), getCandidateNotifications);

// Job management routes
router.get('/jobs/saved', authorize('candidate'), getSavedJobs);
router.get('/saved-jobs', authorize('candidate'), getSavedJobs); // Alias for convenience
router.post('/jobs/:jobId/apply', authorize('candidate'), applyForJob);
router.post('/jobs/:jobId/save', authorize('candidate'), saveJob);
router.delete('/jobs/:jobId/unsave', authorize('candidate'), unsaveJob);
router.delete('/applications/:applicationId/withdraw', authorize('candidate'), withdrawApplication);

// Experience management routes
router
  .route('/experiences')
  .get(authorize('candidate'), getCandidateExperiences)
  .post(authorize('candidate'), addCandidateExperience);

router
  .route('/experiences/:id')
  .put(authorize('candidate'), updateCandidateExperience)
  .delete(authorize('candidate'), deleteCandidateExperience);

// Education management routes
router
  .route('/educations')
  .get(authorize('candidate'), getCandidateEducations)
  .post(authorize('candidate'), addCandidateEducation);

router
  .route('/educations/:id')
  .put(authorize('candidate'), updateCandidateEducation)
  .delete(authorize('candidate'), deleteCandidateEducation);

// Skill management routes
router
  .route('/skills')
  .get(authorize('candidate'), getCandidateSkills)
  .post(authorize('candidate'), addCandidateSkill);

router
  .route('/skills/:id')
  .put(authorize('candidate'), updateCandidateSkill)
  .delete(authorize('candidate'), deleteCandidateSkill);

// Admin/Recruiter routes for candidate management
router
  .route('/')
  .get(authorize('recruiter', 'admin'), getCandidates)
  .post(authorize('candidate'), createCandidate);

router
  .route('/:id')
  .get(getCandidate)
  .put(authorize('candidate', 'admin'), updateCandidate)
  .delete(authorize('candidate', 'admin'), deleteCandidate);

module.exports = router;
