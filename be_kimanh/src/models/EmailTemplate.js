const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  template_name: {
    type: String,
    required: [true, 'Please add template name'],
    unique: true,
    trim: true,
    maxlength: [100, 'Template name cannot be more than 100 characters']
  },
  subject: {
    type: String,
    required: [true, 'Please add email subject'],
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Please add email content'],
    maxlength: [10000, 'Content cannot be more than 10000 characters']
  },
  template_type: {
    type: String,
    enum: ['welcome', 'email_verification', 'password_reset', 'interview_invitation', 'application_status', 'job_recommendation', 'newsletter'],
    required: [true, 'Please specify template type']
  },
  variables: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: [200, 'Description cannot be more than 200 characters']
    },
    is_required: {
      type: Boolean,
      default: false
    }
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  last_modified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for template queries
emailTemplateSchema.index({ template_type: 1, is_active: 1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
