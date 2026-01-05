const mongoose = require('mongoose');

const aiFeedbackSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recommendation_type: {
    type: String,
    enum: ['job_recommendation', 'candidate_recommendation'],
    required: [true, 'Please specify recommendation type']
  },
  recommendation_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recommendation_type_model'
  },
  recommendation_type_model: {
    type: String,
    enum: ['AIJobRecommendation', 'AICandidateRecommendation'],
    required: true
  },
  feedback_type: {
    type: String,
    enum: ['like', 'dislike', 'not_interested', 'not_relevant', 'already_applied', 'salary_mismatch', 'location_mismatch'],
    required: [true, 'Please specify feedback type']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comments: {
    type: String,
    maxlength: [500, 'Comments cannot be more than 500 characters']
  },
  is_processed: {
    type: Boolean,
    default: false
  },
  processed_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for feedback queries
aiFeedbackSchema.index({ user_id: 1, created_at: -1 });
aiFeedbackSchema.index({ recommendation_type: 1, feedback_type: 1 });
aiFeedbackSchema.index({ is_processed: 1 });

module.exports = mongoose.model('AIFeedback', aiFeedbackSchema);
