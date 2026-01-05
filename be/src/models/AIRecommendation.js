const mongoose = require('mongoose');

const aiRecommendationSchema = new mongoose.Schema({
  // Who is making the recommendation request
  requester_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requester_type: {
    type: String,
    enum: ['candidate', 'recruiter'],
    required: true
  },
  
  // What is being recommended
  recommendation_type: {
    type: String,
    enum: ['job_for_candidate', 'candidate_for_job'],
    required: true
  },
  
  // The recommended entity
  recommended_entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  recommended_entity_type: {
    type: String,
    enum: ['Job', 'Candidate'],
    required: true
  },
  
  // Context for the recommendation (optional job context for candidate recommendations)
  context_job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null
  },
  
  // Scoring and algorithm info
  score: {
    type: Number,
    min: [0, 'Score cannot be negative'],
    max: [1, 'Score cannot exceed 1'],
    required: [true, 'Please provide recommendation score']
  },
  confidence: {
    type: Number,
    min: [0, 'Confidence cannot be negative'],
    max: [1, 'Confidence cannot exceed 1'],
    default: 0.5
  },
  algorithm_version: {
    type: String,
    required: [true, 'Please specify algorithm version'],
    default: 'v1.0'
  },
  
  // Detailed reasoning
  reasons: [{
    factor: {
      type: String,
      enum: ['skills_match', 'experience_match', 'location_match', 'salary_match', 'education_match', 'industry_match', 'portfolio_quality', 'past_performance', 'availability'],
      required: true
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      max: [1, 'Weight cannot exceed 1'],
      required: true
    },
    score: {
      type: Number,
      min: [0, 'Factor score cannot be negative'],
      max: [1, 'Factor score cannot exceed 1'],
      required: true
    },
    description: {
      type: String,
      maxlength: [200, 'Description cannot be more than 200 characters']
    }
  }],
  
  // User interaction tracking
  is_viewed: {
    type: Boolean,
    default: false
  },
  viewed_at: {
    type: Date,
    default: null
  },
  is_clicked: {
    type: Boolean,
    default: false
  },
  clicked_at: {
    type: Date,
    default: null
  },
  user_feedback: {
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    is_helpful: {
      type: Boolean,
      default: null
    },
    feedback_text: {
      type: String,
      maxlength: [500, 'Feedback cannot be more than 500 characters']
    },
    feedback_date: {
      type: Date,
      default: null
    }
  },
  
  // Expiry and status
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Compound indexes for efficient queries
aiRecommendationSchema.index({ requester_id: 1, recommendation_type: 1, created_at: -1 });
aiRecommendationSchema.index({ recommended_entity_id: 1, recommended_entity_type: 1 });
aiRecommendationSchema.index({ score: -1, created_at: -1 });
aiRecommendationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for getting the target candidate/recruiter ID based on type
aiRecommendationSchema.virtual('target_candidate_id').get(function() {
  return this.requester_type === 'candidate' ? this.requester_id : null;
});

aiRecommendationSchema.virtual('target_recruiter_id').get(function() {
  return this.requester_type === 'recruiter' ? this.requester_id : null;
});

// Pre-save middleware to set expiry based on recommendation type
aiRecommendationSchema.pre('save', function(next) {
  // Job recommendations expire faster than candidate recommendations
  if (this.isNew && !this.expires_at) {
    const daysToExpire = this.recommendation_type === 'job_for_candidate' ? 14 : 30;
    this.expires_at = new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000);
  }
  next();
});

// Populate based on recommendation type
aiRecommendationSchema.pre(/^find/, function(next) {
  const populateOptions = [];
  
  // Always populate requester
  populateOptions.push({
    path: 'requester_id',
    select: 'full_name email role'
  });
  
  // Conditionally populate based on recommendation type
  if (this.getQuery().recommendation_type === 'job_for_candidate') {
    populateOptions.push({
      path: 'recommended_entity_id',
      model: 'Job',
      select: 'title company_name location salary_min salary_max job_type work_location'
    });
  } else if (this.getQuery().recommendation_type === 'candidate_for_job') {
    populateOptions.push({
      path: 'recommended_entity_id',
      model: 'Candidate',
      select: 'user_id skills_summary experience_years',
      populate: {
        path: 'user_id',
        select: 'full_name email'
      }
    });
  }
  
  // Populate context job if exists
  if (this.getQuery().context_job_id) {
    populateOptions.push({
      path: 'context_job_id',
      select: 'title company_name'
    });
  }
  
  populateOptions.forEach(option => this.populate(option));
  next();
});

module.exports = mongoose.model('AIRecommendation', aiRecommendationSchema);