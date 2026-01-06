const mongoose = require('mongoose');

const aiUserPreferencesSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  preference_type: {
    type: String,
    enum: ['job_preferences', 'notification_preferences', 'recommendation_settings', 'search_filters'],
    required: [true, 'Please specify preference type']
  },
  preference_data: {
    // For job preferences
    preferred_job_types: [{
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'internship', 'freelance']
    }],
    preferred_locations: [{
      type: String,
      trim: true
    }],
    preferred_salary_range: {
      min: {
        type: Number,
        min: [0, 'Minimum salary cannot be negative']
      },
      max: {
        type: Number,
        min: [0, 'Maximum salary cannot be negative']
      }
    },
    preferred_skills: [{
      type: String,
      trim: true
    }],
    preferred_industries: [{
      type: String,
      trim: true
    }],
    work_arrangement: {
      type: String,
      enum: ['onsite', 'remote', 'hybrid', 'flexible']
    },
    
    // For notification preferences
    email_notifications: {
      job_recommendations: {
        type: Boolean,
        default: true
      },
      application_updates: {
        type: Boolean,
        default: true
      },
      interview_reminders: {
        type: Boolean,
        default: true
      },
      newsletter: {
        type: Boolean,
        default: false
      }
    },
    push_notifications: {
      type: Boolean,
      default: true
    },
    
    // For recommendation settings
    recommendation_frequency: {
      type: String,
      enum: ['daily', 'weekly', 'bi_weekly', 'monthly'],
      default: 'weekly'
    },
    max_recommendations_per_batch: {
      type: Number,
      min: [5, 'Minimum 5 recommendations'],
      max: [50, 'Maximum 50 recommendations'],
      default: 10
    }
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative'],
    max: [1, 'Weight cannot exceed 1'],
    default: 1
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

// Compound index for user preferences
aiUserPreferencesSchema.index({ user_id: 1, preference_type: 1 });

module.exports = mongoose.model('AIUserPreferences', aiUserPreferencesSchema);
