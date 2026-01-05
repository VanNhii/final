const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  recruiter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruiter',
    required: true
  },
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruiterSubscription',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Please add payment amount'],
    min: [0, 'Amount cannot be negative']
  },
  payment_method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'paypal', 'momo', 'zalopay', 'vnpay'],
    required: [true, 'Please specify payment method']
  },
  payment_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
 
  gateway_response: {
    gateway: {
      type: String,
      trim: true
    },
    transaction_ref: {
      type: String,
      trim: true
    },
    response_code: {
      type: String,
      trim: true
    },
    response_message: {
      type: String,
      trim: true
    },
    raw_response: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  payment_details: {
    card_last_four: {
      type: String,
      match: [/^\d{4}$/, 'Card last four must be 4 digits']
    },
    card_brand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover', 'jcb']
    },
    bank_name: {
      type: String,
      trim: true
    }
  },
  processed_at: {
    type: Date,
    default: null
  },
  failed_reason: {
    type: String,
    maxlength: [500, 'Failed reason cannot be more than 500 characters']
  },
  refund_amount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative'],
    default: 0
  },
  refunded_at: {
    type: Date,
    default: null
  },
  // Recurring subscription fields
  is_recurring: {
    type: Boolean,
    default: false
  },
  billing_cycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: null
  },
  next_billing_date: {
    type: Date,
    default: null
  },
  auto_renew: {
    type: Boolean,
    default: false
  },
  // Electronic invoice fields
  invoice: {
    invoice_number: {
      type: String,
      unique: true,
      sparse: true
    },
    invoice_date: {
      type: Date,
      default: null
    },
    invoice_url: {
      type: String,
      trim: true
    },
    tax_amount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative'],
      default: 0
    },
    tax_rate: {
      type: Number,
      min: [0, 'Tax rate cannot be negative'],
      max: [100, 'Tax rate cannot exceed 100%'],
      default: 10 // 10% VAT default for Vietnam
    },
    invoice_status: {
      type: String,
      enum: ['not_issued', 'issued', 'sent', 'cancelled'],
      default: 'not_issued'
    }
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Index for payment queries
paymentSchema.index({ recruiter_id: 1, created_at: -1 });
paymentSchema.index({ payment_status: 1 });
paymentSchema.index({ processed_at: -1 });

// Populate recruiter data
paymentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'recruiter_id',
    select: 'company_name user_id',
    populate: {
      path: 'user_id',
      select: 'full_name email'
    }
  }).populate({
    path: 'subscription_id',
    select: 'plan_type start_date end_date'
  });
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
