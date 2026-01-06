const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activity_type: {
    type: String,
    enum: ['login', 'logout', 'job_view', 'job_apply', 'profile_update', 'search', 'message_sent', 'interview_scheduled', 'admin_action'],
    required: [true, 'Please specify activity type']
  },
  entity_type: {
    type: String,
    enum: ['Job', 'Application', 'User', 'Message', 'Interview', 'Search'],
    default: null
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  activity_data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  ip_address: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty values
        // IPv4 pattern
        const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // IPv6 pattern (simplified)
        const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
        // Special cases for localhost and development
        const specialCases = /^(localhost|127\.0\.0\.1|::1|::ffff:.+)$/;
        
        return ipv4Pattern.test(v) || ipv6Pattern.test(v) || specialCases.test(v);
      },
      message: 'Please provide a valid IP address'
    }
  },
  user_agent: {
    type: String,
    trim: true
  },
  session_id: {
    type: String,
    trim: true
  },
  duration_seconds: {
    type: Number,
    min: [0, 'Duration cannot be negative']
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for activity queries
userActivitySchema.index({ user_id: 1, created_at: -1 });
userActivitySchema.index({ activity_type: 1, created_at: -1 });
userActivitySchema.index({ entity_type: 1, entity_id: 1 });
userActivitySchema.index({ created_at: -1 });

// TTL index to automatically delete old activities (keep for 6 months)
userActivitySchema.index({ created_at: 1 }, { expireAfterSeconds: 15552000 }); // 6 months

module.exports = mongoose.model('UserActivity', userActivitySchema);
