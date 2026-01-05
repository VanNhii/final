const mongoose = require('mongoose');

const companyReviewSchema = new mongoose.Schema({
  recruiter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruiter',
    required: true
  },
  reviewer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Overall rating
  overall_rating: {
    type: Number,
    required: [true, 'Please provide overall rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  // Detailed ratings
  work_life_balance_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  salary_benefit_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  career_growth_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  management_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  work_environment_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  // Review content
  review_title: {
    type: String,
    required: [true, 'Please add review title'],
    trim: true,
    maxlength: [100, 'Review title cannot be more than 100 characters']
  },
  review_content: {
    type: String,
    required: [true, 'Please add review content'],
    maxlength: [2000, 'Review content cannot be more than 2000 characters']
  },
  pros: [{
    type: String,
    trim: true,
    maxlength: [200, 'Pros cannot be more than 200 characters']
  }],
  cons: [{
    type: String,
    trim: true,
    maxlength: [200, 'Cons cannot be more than 200 characters']
  }],
  // Reviewer info
  position: {
    type: String,
    trim: true,
    maxlength: [100, 'Position cannot be more than 100 characters']
  },
  employment_status: {
    type: String,
    enum: ['current_employee', 'former_employee', 'intern', 'contractor'],
    required: [true, 'Please specify employment status']
  },
  employment_duration: {
    type: String,
    enum: ['less_than_1_year', '1_2_years', '2_5_years', '5_10_years', 'more_than_10_years'],
    default: null
  },
  // Verification and moderation
  is_verified: {
    type: Boolean,
    default: false
  },
  verification_method: {
    type: String,
    enum: ['email', 'employment_proof', 'admin_verified'],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending'
  },
  rejection_reason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot be more than 500 characters']
  },
  // Engagement metrics
  helpful_count: {
    type: Number,
    default: 0,
    min: [0, 'Helpful count cannot be negative']
  },
  not_helpful_count: {
    type: Number,
    default: 0,
    min: [0, 'Not helpful count cannot be negative']
  },
  views_count: {
    type: Number,
    default: 0,
    min: [0, 'Views count cannot be negative']
  },
  // User interactions tracking
  helpful_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  not_helpful_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Moderation
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewed_at: {
    type: Date,
    default: null
  },
  is_anonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Compound index - one user can only review one company once
companyReviewSchema.index({ recruiter_id: 1, reviewer_id: 1 }, { unique: true });

// Index for queries
companyReviewSchema.index({ recruiter_id: 1, status: 1, created_at: -1 });
companyReviewSchema.index({ overall_rating: -1 });
companyReviewSchema.index({ helpful_count: -1 });

// Populate company and reviewer info
companyReviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'recruiter_id',
    select: 'company_name logo_url'
  });
  
  // Only populate reviewer if not anonymous
  if (!this.is_anonymous) {
    this.populate({
      path: 'reviewer_id',
      select: 'full_name avatar_url'
    });
  }
  
  next();
});

// Virtual for average rating calculation
companyReviewSchema.virtual('average_detailed_rating').get(function() {
  const ratings = [
    this.work_life_balance_rating,
    this.salary_benefit_rating,
    this.career_growth_rating,
    this.management_rating,
    this.work_environment_rating
  ].filter(r => r); // Filter out null/undefined
  
  if (ratings.length === 0) return this.overall_rating;
  
  const sum = ratings.reduce((acc, curr) => acc + curr, 0);
  return (sum / ratings.length).toFixed(1);
});

// Ensure virtual fields are serialized
companyReviewSchema.set('toJSON', { virtuals: true });
companyReviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CompanyReview', companyReviewSchema);
