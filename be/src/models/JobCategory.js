const mongoose = require('mongoose');

const jobCategorySchema = new mongoose.Schema({
  category_name: {
    type: String,
    required: [true, 'Please add category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  name: { // Alias for category_name for consistency
    type: String,
    get: function() {
      return this.category_name;
    },
    set: function(value) {
      this.category_name = value;
    }
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [100, 'Icon cannot be more than 100 characters']
  },
  color: {
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  parent_category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobCategory',
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  sort_order: {
    type: Number,
    default: 0
  },
  meta_title: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot be more than 60 characters']
  },
  meta_description: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot be more than 160 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  },
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

// Virtual for subcategories
jobCategorySchema.virtual('subcategories', {
  ref: 'JobCategory',
  localField: '_id',
  foreignField: 'parent_category_id'
});

// Virtual for jobs count
jobCategorySchema.virtual('jobs_count', {
  ref: 'Job',
  localField: '_id',
  foreignField: 'categories',
  count: true
});

// Pre-save middleware to generate slug
jobCategorySchema.pre('save', function(next) {
  if (this.isModified('category_name') || this.isNew) {
    this.slug = this.category_name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  next();
});

// Index for better performance (category_name and slug already have unique: true)
jobCategorySchema.index({ parent_category_id: 1 });
jobCategorySchema.index({ is_active: 1, sort_order: 1 });

// Ensure virtual fields are serialized
jobCategorySchema.set('toJSON', { virtuals: true, getters: true });
jobCategorySchema.set('toObject', { virtuals: true, getters: true });

module.exports = mongoose.model('JobCategory', jobCategorySchema);
