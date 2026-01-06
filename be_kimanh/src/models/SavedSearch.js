const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  search_name: {
    type: String,
    required: [true, 'Please add a name for this saved search'],
    trim: true,
    maxlength: [100, 'Search name cannot be more than 100 characters']
  },
  search_criteria: {
    keywords: {
      type: String,
      trim: true,
      maxlength: [200, 'Keywords cannot be more than 200 characters']
    },
    location: {
      city: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        default: 'Vietnam'
      }
    },
    job_type: [{
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance']
    }],
    work_location: [{
      type: String,
      enum: ['onsite', 'remote', 'hybrid']
    }],
    seniority_level: [{
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'executive']
    }],
    salary_range: {
      min: {
        type: Number,
        min: [0, 'Minimum salary cannot be negative']
      },
      max: {
        type: Number,
        min: [0, 'Maximum salary cannot be negative']
      }
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobCategory'
    }],
    skills: [{
      type: String,
      trim: true
    }],
    experience_years: {
      min: {
        type: Number,
        min: [0, 'Minimum experience cannot be negative']
      },
      max: {
        type: Number,
        min: [0, 'Maximum experience cannot be negative']
      }
    }
  },
  // Alert settings
  enable_alerts: {
    type: Boolean,
    default: true
  },
  notification_frequency: {
    type: String,
    enum: ['immediate', 'daily', 'weekly', 'bi_weekly'],
    default: 'daily'
  },
  notification_channels: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    in_app: {
      type: Boolean,
      default: true
    }
  },
  // Tracking
  is_active: {
    type: Boolean,
    default: true
  },
  last_notified_at: {
    type: Date,
    default: null
  },
  last_checked_at: {
    type: Date,
    default: Date.now
  },
  new_jobs_count: {
    type: Number,
    default: 0,
    min: [0, 'Count cannot be negative']
  },
  total_results: {
    type: Number,
    default: 0,
    min: [0, 'Count cannot be negative']
  },
  // Usage stats
  times_searched: {
    type: Number,
    default: 0,
    min: [0, 'Count cannot be negative']
  },
  last_searched_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for user's saved searches
savedSearchSchema.index({ user_id: 1, created_at: -1 });
savedSearchSchema.index({ user_id: 1, is_active: 1 });
savedSearchSchema.index({ enable_alerts: 1, notification_frequency: 1, last_notified_at: 1 });

// Populate categories
savedSearchSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'search_criteria.categories',
    select: 'category_name icon'
  });
  next();
});

// Method to check if notification is due
savedSearchSchema.methods.isNotificationDue = function() {
  if (!this.enable_alerts) return false;
  if (!this.last_notified_at) return true;
  
  const now = new Date();
  const lastNotified = new Date(this.last_notified_at);
  const hoursDiff = (now - lastNotified) / (1000 * 60 * 60);
  
  switch (this.notification_frequency) {
    case 'immediate':
      return hoursDiff >= 0.5; // 30 minutes
    case 'daily':
      return hoursDiff >= 24;
    case 'weekly':
      return hoursDiff >= 168; // 7 days
    case 'bi_weekly':
      return hoursDiff >= 336; // 14 days
    default:
      return false;
  }
};

// Ensure virtual fields are serialized
savedSearchSchema.set('toJSON', { virtuals: true });
savedSearchSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
