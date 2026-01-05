// User & Authentication Models
const User = require('./User');

// Candidate Models
const Candidate = require('./Candidate');

// Recruiter Models
const Recruiter = require('./Recruiter');
const RecruiterSubscription = require('./RecruiterSubscription');
const ServicePlan = require('./ServicePlan');

// Job Models
const Job = require('./Job');
const JobCategory = require('./JobCategory');
const FavoriteJob = require('./FavoriteJob');
const Skill = require('./Skill');
const SavedSearch = require('./SavedSearch');

// Application Models
const Application = require('./Application');
const ApplicationStatusHistory = require('./ApplicationStatusHistory');

// Interview Models
const Interview = require('./Interview');
const InterviewFeedback = require('./InterviewFeedback');

// AI & Recommendation Models
const AIRecommendation = require('./AIRecommendation');
const AIUserPreferences = require('./AIUserPreferences');
const AIFeedback = require('./AIFeedback');

// Communication Models
const Notification = require('./Notification');
const Message = require('./Message');
const EmailTemplate = require('./EmailTemplate');

// Content Management Models
const Content = require('./Content');

// Admin & Report Models
const Report = require('./Report');
const CompanyReview = require('./CompanyReview');

// Payment Models
const Payment = require('./Payment');

// System Models
const FileUpload = require('./FileUpload');
const UserActivity = require('./UserActivity');
const SystemSetting = require('./SystemSetting');

module.exports = {
  // User & Authentication
  User,
  
  // Candidate
  Candidate,
  
  // Recruiter
  Recruiter,
  RecruiterSubscription,
  ServicePlan,
  
  // Job
  Job,
  JobCategory,
  FavoriteJob,
  Skill,
  SavedSearch,
  
  // Application
  Application,
  ApplicationStatusHistory,
  
  // Interview
  Interview,
  InterviewFeedback,
  
  // AI & Recommendations
  AIRecommendation,
  AIUserPreferences,
  AIFeedback,
  
  // Communication
  Notification,
  Message,
  EmailTemplate,
  
  // Content Management
  Content,
  
  // Admin & Reports
  Report,
  CompanyReview,
  
  // Payment
  Payment,
  
  // System
  FileUpload,
  UserActivity,
  SystemSetting
};
