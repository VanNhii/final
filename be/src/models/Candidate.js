const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  date_of_birth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: null
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, 'City cannot be more than 50 characters']
  },
  education_level: {
    type: String,
    enum: ['high_school', 'associate', 'bachelor', 'master', 'doctorate', 'other'],
    default: null
  },
  experience_years: {
    type: Number,
    min: [0, 'Experience years cannot be negative'],
    max: [50, 'Experience years cannot be more than 50']
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot be more than 1000 characters']
  },
  cv_url: {
    type: String,
    default: null
  },
  linkedin_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(www\.)?linkedin\.com\//.test(v);
      },
      message: 'Please provide a valid LinkedIn URL'
    }
  },
  github_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/(www\.)?github\.com\//.test(v);
      },
      message: 'Please provide a valid GitHub URL'
    }
  },
  portfolio_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\//.test(v);
      },
      message: 'Please provide a valid portfolio URL'
    }
  },
  salary_expectation: {
    min: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative']
    },
    max: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative']
    }
  },
  job_status: {
    type: String,
    enum: ['seeking', 'employed', 'not_seeking'],
    default: 'seeking'
  },
  
  // Education (embedded array instead of separate table)
  education: [{
    school_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'School name cannot be more than 150 characters']
    },
    degree: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Degree cannot be more than 100 characters']
    },
    major: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Major cannot be more than 100 characters']
    },
    start_date: {
      type: Date,
      required: true
    },
    end_date: {
      type: Date,
      validate: {
        validator: function(v) {
          return !v || v >= this.start_date;
        },
        message: 'End date must be after start date'
      }
    },
    gpa: {
      type: Number,
      min: [0, 'GPA cannot be negative'],
      max: [4.0, 'GPA cannot be more than 4.0']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    is_current: {
      type: Boolean,
      default: false
    }
  }],
  
  // Work Experience (embedded array instead of separate table)
  experience: [{
    company_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Company name cannot be more than 100 characters']
    },
    position: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Position cannot be more than 100 characters']
    },
    start_date: {
      type: Date,
      required: true
    },
    end_date: {
      type: Date,
      validate: {
        validator: function(v) {
          return !v || v >= this.start_date;
        },
        message: 'End date must be after start date'
      }
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    is_current: {
      type: Boolean,
      default: false
    },
    technologies: [{
      type: String,
      trim: true
    }]
  }],
  
  // Skills (embedded array instead of separate table)
  skills_detailed: [{
    skill_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Skill name cannot be more than 50 characters']
    },
    skill_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true
    },
    years_of_experience: {
      type: Number,
      min: [0, 'Years of experience cannot be negative'],
      max: [50, 'Years of experience cannot be more than 50'],
      default: 0
    },
    is_primary: {
      type: Boolean,
      default: false
    }
  }],
  cv_file_url: {
    type: String,
    default: null
  },
  // Saved/bookmarked jobs
  saved_jobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }]
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Populate user data when querying candidate
// Note: Disabled because controllers handle populate explicitly
// candidateSchema.pre(/^find/, function(next) {
//   this.populate({
//     path: 'user_id',
//     select: 'first_name last_name email phone avatar_url'
//   });
//   next();
// });

// Virtual for applications
candidateSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'candidate_id'
});

// Ensure virtual fields are serialized
candidateSchema.set('toJSON', { virtuals: true });
candidateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Candidate', candidateSchema);
