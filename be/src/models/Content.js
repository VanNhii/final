const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a content title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'Please add content body']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot be more than 500 characters'],
    trim: true
  },
  featured_image_url: {
    type: String,
    trim: true
  },
  author_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content type determines the category options and behavior
  content_type: {
    type: String,
    enum: ['blog_post', 'news_article', 'announcement'],
    required: [true, 'Please specify content type']
  },
  
  // Dynamic category based on content type
  category: {
    type: String,
    required: [true, 'Please specify content category'],
    validate: {
      validator: function(v) {
        const validCategories = {
          blog_post: ['career_tips', 'industry_insights', 'company_spotlight', 'tech_trends', 'interview_tips', 'salary_guide', 'skill_development'],
          news_article: ['job_market', 'salary_trends', 'company_news', 'hiring_trends', 'tech_industry', 'policy_updates', 'event_announcements'],
          announcement: ['system_update', 'feature_release', 'maintenance', 'policy_change', 'event']
        };
        return validCategories[this.content_type]?.includes(v);
      },
      message: 'Invalid category for the specified content type'
    }
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  
  published_at: {
    type: Date,
    default: null
  },
  
  // Feature flags
  is_featured: {
    type: Boolean,
    default: false
  },
  is_urgent: {
    type: Boolean,
    default: false
  },
  is_pinned: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  views_count: {
    type: Number,
    default: 0
  },
  reading_time: {
    type: Number, // in minutes
    default: 1
  },
  
  // News-specific fields (optional)
  source: {
    name: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    }
  },
  related_companies: [{
    type: String,
    trim: true
  }],
  
  // SEO fields
  meta_title: {
    type: String,
    maxlength: [70, 'Meta title cannot be more than 70 characters'],
    trim: true
  },
  meta_description: {
    type: String,
    maxlength: [160, 'Meta description cannot be more than 160 characters'],
    trim: true
  },
  
  // Scheduling
  scheduled_publish_at: {
    type: Date,
    default: null
  },
  
  // Content settings
  allow_comments: {
    type: Boolean,
    default: true
  },
  send_notification: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Generate slug from title before saving
contentSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/-+/g, '-') // Replace multiple - with single -
      .trim('-'); // Remove - from start and end
  }
  
  // Set published_at when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.published_at) {
    this.published_at = new Date();
  }
  
  // Auto-calculate reading time based on content length
  if (this.isModified('content')) {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = this.content.split(/\s+/).length;
    this.reading_time = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }
  
  next();
});

// Populate author info when querying
contentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'author_id',
    select: 'full_name avatar_url'
  });
  next();
});

// Virtual for content type display name
contentSchema.virtual('content_type_display').get(function() {
  const displayNames = {
    blog_post: 'Blog Post',
    news_article: 'News Article',
    announcement: 'Announcement'
  };
  return displayNames[this.content_type] || this.content_type;
});

// Index for search and filtering
contentSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
contentSchema.index({ content_type: 1, category: 1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ status: 1, published_at: -1 });
contentSchema.index({ is_featured: 1, is_urgent: 1, is_pinned: 1 });
contentSchema.index({ author_id: 1, created_at: -1 });

// Ensure virtual fields are serialized
contentSchema.set('toJSON', { virtuals: true });
contentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Content', contentSchema);