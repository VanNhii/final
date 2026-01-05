const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    recruiter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Please add a job title"],
      trim: true,
      maxlength: [100, "Job title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please add a job description"],
      maxlength: [5000, "Job description cannot be more than 5000 characters"],
    },
    requirements: {
      type: [String],
      required: [true, "Please add job requirements"],
      validate: {
        validator: function (arr) {
          return arr && arr.length > 0;
        },
        message: "At least one requirement is required",
      },
    },
    benefits: {
      type: [String],
      default: [],
    },
    salary_min: {
      type: Number,
      min: [0, "Minimum salary cannot be negative"],
    },
    salary_max: {
      type: Number,
      min: [0, "Maximum salary cannot be negative"],
      validate: {
        validator: function (v) {
          return !this.salary_min || v >= this.salary_min;
        },
        message:
          "Maximum salary must be greater than or equal to minimum salary",
      },
    },
    job_type: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship", "freelance"],
      required: [true, "Please specify job type"],
    },
    work_location: {
      type: String,
      enum: ["onsite", "remote", "hybrid"],
      required: [true, "Please specify work location type"],
    },
    positions_available: {
      type: Number,
      min: [1, "Positions available must be at least 1"],
      default: 1,
    },
    seniority_level: {
      type: String,
      enum: ["entry", "junior", "mid", "senior", "lead", "executive"],
      default: "junior",
    },
    location: {
      address: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, "Please add job location city"],
        trim: true,
      },
      country: {
        type: String,
        default: "Vietnam",
        trim: true,
      },
    },
    experience_required: {
      min: {
        type: Number,
        min: [0, "Minimum experience cannot be negative"],
        default: 0,
      },
      max: {
        type: Number,
        min: [0, "Maximum experience cannot be negative"],
      },
    },
    education_required: {
      type: String,
      enum: [
        "high_school",
        "associate",
        "bachelor",
        "master",
        "doctorate",
        "not_required",
      ],
      default: "not_required",
    },
    skills_required: [
      {
        skill_name: {
          type: String,
          required: true,
          trim: true,
        },
        is_required: {
          type: Boolean,
          default: true,
        },
        weight: {
          type: Number,
          min: 1,
          max: 10,
          default: 5,
        },
      },
    ],
    application_deadline: {
      type: Date,
      validate: {
        validator: function (v) {
          return v > new Date();
        },
        message: "Application deadline must be in the future",
      },
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended", "expired"],
      default: "pending",
    },
    admin_notes: {
      type: String,
      trim: true,
      maxlength: [500, "Admin notes cannot be more than 500 characters"],
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    company_name: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot be more than 100 characters"],
    },
 
    is_featured: {
      type: Boolean,
      default: false,
    },
    views_count: {
      type: Number,
      default: 0,
    },
    applications_count: {
      type: Number,
      default: 0,
    },
    is_hot: {
      type: Boolean,
      default: false,
    },
    is_urgent: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    nice_to_have_skills: [
      {
        skill_name: {
          type: String,
          required: true,
          trim: true,
        },
        weight: {
          type: Number,
          min: 1,
          max: 10,
          default: 3,
        },
      },
    ],
    working_conditions: {
      working_hours: {
        type: String,
        trim: true,
        default: "8:00 - 17:30 (Thứ 2 - Thứ 6)",
      },
      working_model: {
        type: String,
        enum: ["onsite", "remote", "hybrid"],
        default: "onsite",
      },
      probation_period: {
        type: String,
        trim: true,
        default: "2 tháng",
      },
      start_date: {
        type: String,
        trim: true,
        default: "Thỏa thuận",
      },
    },
    job_highlights: [
      {
        type: String,
        trim: true,
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobCategory",
      },
    ],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Populate recruiter data when querying jobs
// Note: Disabled because controllers handle populate explicitly
// jobSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "recruiter_id",
//     select: "company_name company_logo_url is_verified",
//     populate: {
//       path: "user_id",
//       select: "first_name last_name email",
//     },
//   }).populate({
//     path: "categories",
//     select: "category_name description",
//   });
//   next();
// });

// Virtual for applications
jobSchema.virtual("applications", {
  ref: "Application",
  localField: "_id",
  foreignField: "job_id",
});

// Index for search performance
jobSchema.index({ title: "text", description: "text" });
jobSchema.index({ "location.city": 1 });
jobSchema.index({ job_type: 1 });
jobSchema.index({ salary_min: 1, salary_max: 1 });
jobSchema.index({ created_at: -1 });
jobSchema.index({ is_active: 1, application_deadline: 1 });

// Ensure virtual fields are serialized
jobSchema.set("toJSON", { virtuals: true });
jobSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Job", jobSchema);
