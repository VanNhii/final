const mongoose = require('mongoose');

const favoriteJobSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job', 
    required: true
  },
  saved_at: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters'],
    trim: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Compound index to ensure one user can only save a job once
favoriteJobSchema.index({ user_id: 1, job_id: 1 }, { unique: true });

// Populate job details when querying favorites
favoriteJobSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'job_id',
    select: 'title company_name location salary_min salary_max job_type work_location application_deadline is_active',
    populate: {
      path: 'recruiter_id',
      select: 'company_name company_logo_url'
    }
  });
  next();
});

module.exports = mongoose.model('FavoriteJob', favoriteJobSchema);