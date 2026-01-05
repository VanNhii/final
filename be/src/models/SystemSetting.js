const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    enum: ['general', 'email', 'seo', 'payment', 'security', 'notifications'],
    unique: true
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  last_updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for quick lookups
systemSettingSchema.index({ section: 1 });

// Pre-save middleware to update the updated_at field
systemSettingSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

// Static method to get settings by section
systemSettingSchema.statics.getBySection = function(section) {
  return this.findOne({ section }).populate('last_updated_by', 'email first_name last_name');
};

// Static method to update settings by section
systemSettingSchema.statics.updateBySection = function(section, settings, userId) {
  return this.findOneAndUpdate(
    { section },
    { 
      settings, 
      last_updated_by: userId,
      updated_at: new Date()
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  ).populate('last_updated_by', 'email first_name last_name');
};

// Static method to get all settings
systemSettingSchema.statics.getAllSettings = async function() {
  const settings = await this.find({}).populate('last_updated_by', 'email first_name last_name');
  
  // Convert to object format expected by frontend
  const settingsObj = {};
  settings.forEach(setting => {
    settingsObj[setting.section] = setting.settings;
  });
  
  return settingsObj;
};

// Static method to initialize default settings
systemSettingSchema.statics.initializeDefaults = async function(userId) {
  const defaultSettings = {
    general: {
      siteName: 'IT Jobs Platform',
      siteDescription: 'Nền tảng tuyển dụng IT hàng đầu Việt Nam',
      contactEmail: 'contact@itjobs.vn',
      supportEmail: 'support@itjobs.vn',
      maxJobPostingDays: 30,
      maxFreeJobPosts: 3,
      enableRegistration: true,
      enableJobPosting: true,
      enableUserReports: true
    },
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: 'noreply@itjobs.vn',
      smtpPassword: '',
      fromEmail: 'noreply@itjobs.vn',
      fromName: 'IT Jobs Platform'
    },
    seo: {
      metaTitle: 'IT Jobs - Việc làm IT hàng đầu',
      metaDescription: 'Tìm kiếm và ứng tuyển các vị trí việc làm IT tốt nhất tại Việt Nam',
      metaKeywords: 'việc làm IT, tuyển dụng IT, jobs, careers',
      ogTitle: 'IT Jobs Platform',
      ogDescription: 'Nền tảng tuyển dụng IT hàng đầu Việt Nam',
      ogImage: '/og-image.jpg'
    },
    payment: {
      enablePayment: true,
      currency: 'VND',
      paymentMethods: ['vnpay', 'momo', 'bank_transfer'],
      taxRate: 10
    },
    security: {
      passwordMinLength: 8,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      enableTwoFactor: false,
      requireEmailVerification: true,
      enableCaptcha: true
    },
    notifications: {
      emailNotifications: true,
      browserNotifications: true,
      smsNotifications: false,
      notifyNewUsers: true,
      notifyNewJobs: true,
      notifyNewApplications: true,
      notifyReports: true
    }
  };

  const promises = Object.entries(defaultSettings).map(([section, settings]) => 
    this.updateBySection(section, settings, userId)
  );

  return Promise.all(promises);
};

// Virtual for formatted update time
systemSettingSchema.virtual('formattedUpdatedAt').get(function() {
  return this.updated_at.toLocaleString('vi-VN');
});

// Ensure virtual fields are serialized
systemSettingSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SystemSetting', systemSettingSchema);