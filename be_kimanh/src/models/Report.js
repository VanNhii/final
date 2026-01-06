const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reported_entity_type: {
    type: String,
    enum: ['User', 'Job', 'Application', 'Message', 'Review'],
    required: [true, 'Please specify reported entity type']
  },
  reported_entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  report_type: {
    type: String,
    enum: ['spam', 'inappropriate_content', 'fake_job', 'harassment', 'discrimination', 'scam', 'other'],
    required: [true, 'Please specify report type']
  },
  reason: {
    type: String,
    required: [true, 'Please provide reason for report'],
    trim: true,
    maxlength: [100, 'Reason cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide detailed description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
    default: 'pending'
  },
  admin_notes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot be more than 1000 characters']
  },
  evidence_files: [{
    file_name: {
      type: String,
      required: true
    },
    file_url: {
      type: String,
      required: true
    },
    file_type: {
      type: String,
      required: true
    }
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  resolved_at: {
    type: Date,
    default: null
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolution_action: {
    type: String,
    enum: ['no_action', 'warning_sent', 'content_removed', 'account_suspended', 'account_banned'],
    default: null
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for report queries
reportSchema.index({ status: 1, created_at: -1 });
reportSchema.index({ reporter_id: 1 });
reportSchema.index({ reported_entity_type: 1, reported_entity_id: 1 });
reportSchema.index({ priority: 1 });

// Populate reporter data
reportSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'reporter_id',
    select: 'full_name email role'
  }).populate({
    path: 'resolved_by',
    select: 'full_name email'
  });
  next();
});

module.exports = mongoose.model('Report', reportSchema);
