const mongoose = require('mongoose');

const servicePlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add plan name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add plan description']
  },
  price: {
    type: Number,
    required: [true, 'Please add price'],
    min: [0, 'Price cannot be negative']
  },
  duration_days: {
    type: Number,
    required: [true, 'Please add duration in days'],
    min: [1, 'Duration must be at least 1 day']
  },
  plan_type: {
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    required: [true, 'Please specify plan type']
  },
  features: {
    job_posts_limit: {
      type: Number,
      required: true,
      min: [1, 'Job posts limit must be at least 1']
    },
    featured_jobs: {
      type: Number,
      default: 0,
      min: [0, 'Featured jobs cannot be negative']
    },
    candidate_search: {
      type: Boolean,
      default: false
    },
    advanced_analytics: {
      type: Boolean,
      default: false
    },
    priority_support: {
      type: Boolean,
      default: false
    },
    cv_downloads: {
      type: Number,
      default: 0,
      min: [0, 'CV downloads cannot be negative']
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  sort_order: {
    type: Number,
    default: 0
  },
  is_popular: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#007bff'
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for plan queries
servicePlanSchema.index({ is_active: 1, sort_order: 1 });
servicePlanSchema.index({ plan_type: 1 });

module.exports = mongoose.model('ServicePlan', servicePlanSchema);
