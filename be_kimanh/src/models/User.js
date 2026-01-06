const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.social_id; // Password not required if using social OAuth
      },
      minlength: 8,
      select: false,
    },
    // Social OAuth integration (Google, Facebook, LinkedIn, GitHub)
    social_id: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values but unique non-null values
    },
    provider: {
      type: String,
      enum: ["local", "google", "facebook", "linkedin", "github"],
      default: "local",
    },
    social_profile: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    role: {
      type: String,
      enum: ["candidate", "recruiter", "admin"],
      default: "candidate",
    },
    phone: {
      type: String,
      trim: true,
    },
    first_name: {
      type: String,
      required: [true, "Please add a first name"],
      trim: true,
      maxlength: [50, "First name cannot be more than 50 characters"],
    },
    last_name: {
      type: String,
      required: [true, "Please add a last name"],
      trim: true,
      maxlength: [50, "Last name cannot be more than 50 characters"],
    },
    avatar_url: {
      type: String,
      default: null,
    },
    account_status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    status_reason: {
      type: String,
      trim: true,
      maxlength: [500, "Status reason cannot be more than 500 characters"],
    },
    status_updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status_updated_at: {
      type: Date,
      default: null,
    },
    last_login: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    // Verification fields (replaced UserVerification model)
    email_verification: {
      code: {
        type: String,
        default: null,
      },
      expires_at: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
        max: 5,
      },
    },
    phone_verification: {
      code: {
        type: String,
        default: null,
      },
      expires_at: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
        max: 5,
      },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate for candidate profile
userSchema.virtual("candidate_profile", {
  ref: "Candidate",
  localField: "_id",
  foreignField: "user_id",
  justOne: true,
});

// Virtual populate for recruiter profile
userSchema.virtual("recruiter_profile", {
  ref: "Recruiter",
  localField: "_id",
  foreignField: "user_id",
  justOne: true,
});

// Virtual field for full name
userSchema.virtual("full_name").get(function () {
  return `${this.first_name} ${this.last_name}`.trim();
});

// Virtual field for verification status
userSchema.virtual("is_verified").get(function () {
  return (
    this.email_verification &&
    this.email_verification.code === null &&
    this.account_status === "approved"
  );
});

// Virtual field for active status
userSchema.virtual("is_active").get(function () {
  return this.account_status === "approved";
});

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Cascade delete related data when user is removed
userSchema.pre("remove", async function (next) {
  // Delete related data based on user role
  if (this.role === "candidate") {
    await this.model("Candidate").deleteOne({ user_id: this._id });
  } else if (this.role === "recruiter") {
    await this.model("Recruiter").deleteOne({ user_id: this._id });
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
