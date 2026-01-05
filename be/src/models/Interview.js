const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  application_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  recruiter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruiter',
    required: true
  },
  candidate_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  interview_type: {
    type: String,
    enum: ['phone', 'video', 'onsite', 'online_test'],
    required: [true, 'Please specify interview type']
  },
  interview_date: {
    type: Date,
    required: [true, 'Please add interview date']
  },
  interview_time: {
    type: String,
    required: [true, 'Please add interview time'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add valid time format (HH:MM)']
  },
  duration_minutes: {
    type: Number,
    min: [15, 'Interview duration must be at least 15 minutes'],
    max: [480, 'Interview duration cannot exceed 8 hours'],
    default: 60
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot be more than 200 characters']
  },
  meeting_link: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\//.test(v);
      },
      message: 'Please provide a valid meeting link'
    }
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
  },
  interviewers: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      trim: true
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  reminder_sent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Populate related data
interviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'application_id',
    select: 'job_id candidate_id application_status',
    populate: {
      path: 'job_id',
      select: 'title company_name salary_min salary_max location'
    }
  }).populate({
    path: 'recruiter_id',
    select: 'company_name company_logo_url user_id',
    populate: {
      path: 'user_id',
      select: 'first_name last_name email phone account_status email_verification'
    }
  }).populate({
    path: 'candidate_id',
    select: 'user_id',
    populate: {
      path: 'user_id',
      select: 'first_name last_name email phone account_status email_verification'
    }
  }).populate({
    path: 'interviewers.user_id',
    select: 'first_name last_name email phone account_status email_verification'
  });
  next();
});

// Virtual for feedback
interviewSchema.virtual('feedback', {
  ref: 'InterviewFeedback',
  localField: '_id',
  foreignField: 'interview_id'
});

// Index for interview queries
interviewSchema.index({ interview_date: 1 });
interviewSchema.index({ candidate_id: 1, interview_date: -1 });
interviewSchema.index({ recruiter_id: 1, interview_date: -1 });

// Ensure virtual fields are serialized
interviewSchema.set('toJSON', { virtuals: true });
interviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Interview', interviewSchema);
