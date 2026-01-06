const mongoose = require('mongoose');

const fileUploadSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  file_name: {
    type: String,
    required: [true, 'Please add file name'],
    trim: true,
    maxlength: [255, 'File name cannot be more than 255 characters']
  },
  original_name: {
    type: String,
    required: [true, 'Please add original file name'],
    trim: true
  },
  file_path: {
    type: String,
    required: [true, 'Please add file path'],
    trim: true
  },
  file_size: {
    type: Number,
    required: [true, 'Please add file size'],
    min: [0, 'File size cannot be negative']
  },
  file_type: {
    type: String,
    required: [true, 'Please specify file type'],
    enum: ['image', 'document', 'video', 'audio', 'archive'],
  },
  mime_type: {
    type: String,
    required: [true, 'Please add mime type'],
    trim: true
  },
  file_extension: {
    type: String,
    required: [true, 'Please add file extension'],
    trim: true,
    lowercase: true
  },
  upload_purpose: {
    type: String,
    enum: ['cv', 'cover_letter', 'portfolio', 'company_logo', 'profile_avatar', 'certificate', 'report_evidence'],
    required: [true, 'Please specify upload purpose']
  },
  is_temporary: {
    type: Boolean,
    default: false
  },
  is_public: {
    type: Boolean,
    default: false
  },
  download_count: {
    type: Number,
    default: 0
  },
  expires_at: {
    type: Date,
    default: null
  },
  related_entity_type: {
    type: String,
    enum: ['User', 'Job', 'Application', 'Message', 'Report'],
    default: null
  },
  related_entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  checksum: {
    type: String,
    trim: true
  },
  storage_provider: {
    type: String,
    enum: ['local', 'aws_s3', 'google_cloud', 'azure'],
    default: 'local'
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for file queries
fileUploadSchema.index({ user_id: 1, created_at: -1 });
fileUploadSchema.index({ upload_purpose: 1 });
fileUploadSchema.index({ is_temporary: 1, expires_at: 1 });
fileUploadSchema.index({ related_entity_type: 1, related_entity_id: 1 });

// TTL index for temporary files
fileUploadSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FileUpload', fileUploadSchema);
