const mongoose = require('mongoose');

const interviewFeedbackSchema = new mongoose.Schema({
  interview_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
    unique: true
  },
  interviewer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidate_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    required: [true, 'Please provide overall candidate rating']
  },
  technical_skills_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    required: [true, 'Please provide technical skills rating']
  },
  communication_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    required: [true, 'Please provide communication rating']
  },
  cultural_fit_rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    required: [true, 'Please provide cultural fit rating']
  },
  comments: {
    type: String,
    maxlength: [2000, 'Comments cannot be more than 2000 characters']
  },
  recommendation: {
    type: String,
    enum: ['strongly_recommend', 'recommend', 'neutral', 'not_recommend', 'strongly_not_recommend'],
    required: [true, 'Please provide recommendation']
  },
  strengths: [{
    type: String,
    trim: true,
    maxlength: [100, 'Strength description cannot be more than 100 characters']
  }],
  weaknesses: [{
    type: String,
    trim: true,
    maxlength: [100, 'Weakness description cannot be more than 100 characters']
  }]
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for feedback queries (interview_id already has unique: true)
interviewFeedbackSchema.index({ interviewer_id: 1 });

module.exports = mongoose.model('InterviewFeedback', interviewFeedbackSchema);
