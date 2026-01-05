const mongoose = require('mongoose');

const recruiterSubscriptionSchema = new mongoose.Schema({
  recruiter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruiter',
    required: true
  },
  service_plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServicePlan',
    required: true
  },
  payment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  start_date: {
    type: Date,
    required: [true, 'Please add start date'],
    default: Date.now
  },
  end_date: {
    type: Date,
    required: [true, 'Please add end date']
  },
  subscription_status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled'],
    default: 'pending'
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  features_used: {
    job_posts_used: {
      type: Number,
      default: 0
    },
    featured_jobs_used: {
      type: Number,
      default: 0
    },
    cv_downloads_used: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for subscription queries
recruiterSubscriptionSchema.index({ recruiter_id: 1, end_date: -1 });
recruiterSubscriptionSchema.index({ subscription_status: 1 });
recruiterSubscriptionSchema.index({ service_plan_id: 1 });

module.exports = mongoose.model('RecruiterSubscription', recruiterSubscriptionSchema);
