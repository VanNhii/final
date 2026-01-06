const ServicePlan = require('../models/ServicePlan');
const RecruiterSubscription = require('../models/RecruiterSubscription');
const Payment = require('../models/Payment');
const Recruiter = require('../models/Recruiter');

// @desc    Get all service plans for admin
// @route   GET /api/v1/service-plans
// @access  Private/Admin
exports.getServicePlans = async (req, res, next) => {
  try {
    const plans = await ServicePlan.find()
      .sort({ sort_order: 1, price: 1 });
    
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available service plans for public
// @route   GET /api/v1/service-plans/available
// @access  Public
exports.getAvailablePlans = async (req, res, next) => {
  try {
    const plans = await ServicePlan.find({ is_active: true })
      .sort({ sort_order: 1, price: 1 })
      .select('-created_at -updated_at');
    
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single service plan
// @route   GET /api/v1/service-plans/:id
// @access  Public
exports.getServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create service plan
// @route   POST /api/v1/service-plans
// @access  Private/Admin
exports.createServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.create(req.body);
    
    res.status(201).json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service plan
// @route   PUT /api/v1/service-plans/:id
// @access  Private/Admin
exports.updateServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service plan
// @route   DELETE /api/v1/service-plans/:id
// @access  Private/Admin
exports.deleteServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }
    
    // Check if any active subscriptions exist
    const activeSubscriptions = await RecruiterSubscription.find({
      service_plan_id: req.params.id,
      subscription_status: 'active'
    });
    
    if (activeSubscriptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service plan with active subscriptions'
      });
    }
    
    await ServicePlan.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Service plan deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Subscribe to service plan
// @route   POST /api/v1/service-plans/:id/subscribe
// @access  Private/Recruiter
exports.subscribeToServicePlan = async (req, res, next) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);
    
    if (!plan || !plan.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found or inactive'
      });
    }
    
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter profile not found'
      });
    }
    
    // Check for existing active subscription
    const existingSubscription = await RecruiterSubscription.findOne({
      recruiter_id: recruiter._id,
      subscription_status: 'active'
    });
    
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription'
      });
    }
    
    // Create payment record
    const payment = await Payment.create({
      recruiter_id: recruiter._id,
      service_plan_id: plan._id,
      amount: plan.price,
      payment_method: req.body.payment_method || 'bank_transfer',
      payment_status: 'pending',
      description: `Subscription to ${plan.name}`
    });
    
    // Create subscription record
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration_days);
    
    const subscription = await RecruiterSubscription.create({
      recruiter_id: recruiter._id,
      service_plan_id: plan._id,
      payment_id: payment._id,
      start_date: startDate,
      end_date: endDate,
      subscription_status: 'pending',
      features_used: {
        job_posts_used: 0,
        featured_jobs_used: 0,
        cv_downloads_used: 0
      }
    });
    
    res.status(201).json({
      success: true,
      data: {
        subscription,
        payment,
        message: 'Subscription created successfully. Please complete payment to activate.'
      }
    });
  } catch (error) {
    next(error);
  }
};
