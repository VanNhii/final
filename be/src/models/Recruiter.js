const mongoose = require("mongoose");

const recruiterSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Company Information
    company_name: {
      type: String,
      required: [true, "Please add company name"],
      trim: true,
      maxlength: [100, "Company name cannot be more than 100 characters"],
    },
    company_description: {
      type: String,
      maxlength: [
        2000,
        "Company description cannot be more than 2000 characters",
      ],
    },
    company_size: {
      type: String,
      enum: ["1-10", "11-50", "51-100", "100-500", "500+"],
      default: null,
    },
    industry: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\//.test(v);
        },
        message: "Please provide a valid website URL",
      },
    },
    company_email: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please provide a valid email",
      },
    },
    company_phone: {
      type: String,
      trim: true,
    },
    company_address: {
      type: String,
      trim: true,
      maxlength: [200, "Company address cannot be more than 200 characters"],
    },
    founded_year: {
      type: Number,
      min: 1800,
      max: new Date().getFullYear(),
    },
    company_locations: [
      {
        city: {
          type: String,
          required: true,
          trim: true,
        },
        address: {
          type: String,
          trim: true,
        },
        is_headquarters: {
          type: Boolean,
          default: false,
        },
      },
    ],
    logo_url: {
      type: String,
      default: null,
    },
    cover_image_url: {
      type: String,
      default: null,
    },

    // Company Culture & Values
    mission: {
      type: String,
      maxlength: [1000, "Mission cannot be more than 1000 characters"],
    },
    vision: {
      type: String,
      maxlength: [1000, "Vision cannot be more than 1000 characters"],
    },
    company_culture: {
      type: String,
      maxlength: [1000, "Company culture cannot be more than 1000 characters"],
    },
    benefits: [
      {
        type: String,
        maxlength: [200, "Benefit cannot be more than 200 characters"],
      },
    ],

    // Contact Person Information
    contact_person_name: {
      type: String,
      trim: true,
      maxlength: [
        100,
        "Contact person name cannot be more than 100 characters",
      ],
    },
    contact_email: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please provide a valid email",
      },
    },
    contact_phone: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
      maxlength: [100, "Position cannot be more than 100 characters"],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, "Department cannot be more than 100 characters"],
    },
    bio: {
      type: String,
      maxlength: [1000, "Bio cannot be more than 1000 characters"],
    },
    avatar_url: {
      type: String,
      default: null,
    },
    skills: [
      {
        type: String,
        maxlength: [50, "Skill cannot be more than 50 characters"],
      },
    ],
    languages: [
      {
        type: String,
        maxlength: [50, "Language cannot be more than 50 characters"],
      },
    ],

    // Social Media Links
    social_links: {
      linkedin: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\//.test(v);
          },
          message: "Please provide a valid URL",
        },
      },
      facebook: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\//.test(v);
          },
          message: "Please provide a valid URL",
        },
      },
      twitter: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^https?:\/\//.test(v);
          },
          message: "Please provide a valid URL",
        },
      },
    },

    // Company verification and subscription
    is_verified: {
      type: Boolean,
      default: false,
    },
    subscription_plan: {
      type: String,
      enum: ["basic", "premium", "enterprise"],
      default: "basic",
    },
    plan_expires_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Virtual for jobs posted
recruiterSchema.virtual("jobs", {
  ref: "Job",
  localField: "_id",
  foreignField: "recruiter_id",
});

// Virtual for subscriptions
recruiterSchema.virtual("subscriptions", {
  ref: "RecruiterSubscription",
  localField: "_id",
  foreignField: "recruiter_id",
});

// Ensure virtual fields are serialized
recruiterSchema.set("toJSON", { virtuals: true });
recruiterSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Recruiter", recruiterSchema);
