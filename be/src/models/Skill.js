const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  skill_name: {
    type: String,
    required: [true, 'Please add skill name'],
    unique: true,
    trim: true,
    maxlength: [100, 'Skill name cannot be more than 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please specify skill category'],
    enum: [
      'programming_language',
      'framework',
      'database',
      'devops',
      'cloud',
      'mobile',
      'web',
      'testing',
      'design',
      'project_management',
      'soft_skill',
      'tool',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [50, 'Subcategory cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  // Alternative names for the skill
  aliases: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Related skills for recommendation
  related_skills: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  }],
  // Popularity metrics
  popularity_score: {
    type: Number,
    default: 0,
    min: [0, 'Popularity score cannot be negative']
  },
  jobs_count: {
    type: Number,
    default: 0,
    min: [0, 'Jobs count cannot be negative']
  },
  candidates_count: {
    type: Number,
    default: 0,
    min: [0, 'Candidates count cannot be negative']
  },
  // SEO and display
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  official_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\//.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  // Status and metadata
  is_active: {
    type: Boolean,
    default: true
  },
  is_trending: {
    type: Boolean,
    default: false
  },
  sort_order: {
    type: Number,
    default: 0
  },
  // Tags for better searchability
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Average proficiency required in jobs
  average_required_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Pre-save middleware to generate slug
skillSchema.pre('save', function(next) {
  if (this.isModified('skill_name') || this.isNew) {
    this.slug = this.skill_name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  next();
});

// Indexes for performance
skillSchema.index({ skill_name: 'text', aliases: 'text', description: 'text' });
skillSchema.index({ category: 1, is_active: 1 });
skillSchema.index({ popularity_score: -1 });
skillSchema.index({ is_trending: 1, popularity_score: -1 });
skillSchema.index({ slug: 1 });

// Static method to find skill by name or alias
skillSchema.statics.findByNameOrAlias = function(name) {
  const searchName = name.toLowerCase().trim();
  return this.findOne({
    $or: [
      { skill_name: new RegExp(`^${searchName}$`, 'i') },
      { aliases: searchName }
    ],
    is_active: true
  });
};

// Static method to get popular skills
skillSchema.statics.getPopularSkills = function(limit = 20) {
  return this.find({ is_active: true })
    .sort({ popularity_score: -1 })
    .limit(limit)
    .select('skill_name category icon color popularity_score');
};

// Static method to get trending skills
skillSchema.statics.getTrendingSkills = function(limit = 10) {
  return this.find({ is_active: true, is_trending: true })
    .sort({ popularity_score: -1 })
    .limit(limit)
    .select('skill_name category icon color popularity_score');
};

// Method to increment popularity
skillSchema.methods.incrementPopularity = function(points = 1) {
  this.popularity_score += points;
  return this.save();
};

// Virtual for display
skillSchema.virtual('display_name').get(function() {
  return this.skill_name;
});

// Populate related skills
skillSchema.pre(/^find/, function(next) {
  // Only populate if explicitly requested to avoid circular references
  if (this.options._populateRelated) {
    this.populate({
      path: 'related_skills',
      select: 'skill_name category icon'
    });
  }
  next();
});

// Ensure virtual fields are serialized
skillSchema.set('toJSON', { virtuals: true });
skillSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Skill', skillSchema);
