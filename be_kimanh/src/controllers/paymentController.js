const Payment = require('../models/Payment');
const Recruiter = require('../models/Recruiter');
const RecruiterSubscription = require('../models/RecruiterSubscription');
const ServicePlan = require('../models/ServicePlan');
const momoService = require('../services/momoService');

// @desc    Get all payments
// @route   GET /api/v1/payments
// @access  Private/Admin
exports.getPayments = async (req, res, next) => {
  try {
    let query = {};
    
    // Filter by recruiter if not admin
    if (req.user.role === 'recruiter') {
      const recruiter = await Recruiter.findOne({ user_id: req.user.id });
      if (recruiter) {
        query.recruiter_id = recruiter._id;
      }
    }
    console.log(query);
    
    // Filter by status if provided
    if (req.query.payment_status) {
      query.payment_status = req.query.payment_status;
    }
    
    const payments = await Payment.find(query).
    populate('recruiter_id').
    
    sort('-created_at');
    console.log(payments);
    
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single payment
// @route   GET /api/v1/payments/:id
// @access  Private
exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Check authorization
    if (req.user.role !== 'admin') {
      const recruiter = await require('../models/Recruiter').findOne({ user_id: req.user.id });
      if (!recruiter || payment.recruiter_id.toString() !== recruiter._id.toString()) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to access this payment'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment
// @route   POST /api/v1/payments
// @access  Private/Recruiter
exports.createPayment = async (req, res, next) => {
  try {
    // Get recruiter
    const recruiter = await require('../models/Recruiter').findOne({ user_id: req.user.id });
    
    if (!recruiter) {
      return res.status(400).json({
        success: false,
        message: 'User is not a recruiter'
      });
    }
    
    req.body.recruiter_id = recruiter._id;
    req.body.transaction_id = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payment = await Payment.create(req.body);
    
    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment status
// @route   PUT /api/v1/payments/:id/status
// @access  Private/Admin
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { payment_status, gateway_response, failed_reason } = req.body;
    
    const updateData = {
      payment_status
    };
    
    if (payment_status === 'completed') {
      updateData.processed_at = new Date();
    }
    
    if (payment_status === 'failed' && failed_reason) {
      updateData.failed_reason = failed_reason;
    }
    
    if (gateway_response) {
      updateData.gateway_response = gateway_response;
    }
    
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process refund
// @route   PUT /api/v1/payments/:id/refund
// @access  Private/Admin
exports.processRefund = async (req, res, next) => {
  try {
    const { refund_amount } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    if (payment.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }
    
    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        payment_status: 'refunded',
        refund_amount: refund_amount || payment.amount,
        refunded_at: new Date()
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/v1/payments/:id
// @access  Private/Admin
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    await payment.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create MoMo payment
// @route   POST /api/v1/payments/momo/create
// @access  Private/Recruiter
exports.createMomoPayment = async (req, res, next) => {
  try {
    const { subscription_id, plan_id, amount, orderInfo } = req.body;
    console.log(req.user.id);
    
    // Get recruiter
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    if (!recruiter) {
      return res.status(400).json({
        success: false,
        message: 'User is not a recruiter'
      });
    }

    let subscription;
    let isNewSubscription = false;

    // Check if this is a new subscription or existing one
    if (subscription_id === 'new' || !subscription_id) {
      // New subscription - we need plan_id
      if (!plan_id) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required for new subscription'
        });
      }

      // Get service plan
      const servicePlan = await ServicePlan.findById(plan_id);
      if (!servicePlan) {
        return res.status(400).json({
          success: false,
          message: 'Service plan not found'
        });
      }

      // Create new subscription (pending payment)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + servicePlan.duration_days);

      subscription = await RecruiterSubscription.create({
        recruiter_id: recruiter._id,
        service_plan_id: plan_id,
        subscription_status: 'pending',
        payment_status: 'pending',
        start_date: startDate,
        end_date: endDate,
        price: amount || servicePlan.price
      });

      isNewSubscription = true;
    } else {
      // Existing subscription - verify it belongs to recruiter
      subscription = await RecruiterSubscription.findById(subscription_id);
      if (!subscription || subscription.recruiter_id.toString() !== recruiter._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription'
        });
      }
    }

    // Create payment record
    const orderId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payment = await Payment.create({
      recruiter_id: recruiter._id,
      subscription_id: subscription._id,
      amount: amount,
      payment_method: 'momo',
      payment_status: 'pending',
      gateway_response: {
        gateway: 'momo',
        transaction_ref: orderId
      }
    });

    // Create MoMo payment
    const momoPayment = await momoService.createPayment({
      orderId: orderId,
      amount: amount,
      orderInfo: orderInfo || `Thanh toán gói dịch vụ`,
      extraData: {
        payment_id: payment._id.toString(),
        subscription_id: subscription._id.toString(),
        recruiter_id: recruiter._id.toString()
      }
    });

    if (!momoPayment.success) {
      // Update payment status to failed
      await Payment.findByIdAndUpdate(payment._id, {
        payment_status: 'failed',
        failed_reason: momoPayment.error.message || 'Failed to create MoMo payment'
      });

      return res.status(400).json({
        success: false,
        message: 'Failed to create MoMo payment',
        error: momoPayment.error
      });
    }

    // Update payment with MoMo response
    await Payment.findByIdAndUpdate(payment._id, {
      'gateway_response.response_code': momoPayment.data.resultCode?.toString(),
      'gateway_response.response_message': momoPayment.data.message,
      'gateway_response.raw_response': momoPayment.data
    });

    res.status(200).json({
      success: true,
      data: {
        payment_id: payment._id,
        payUrl: momoPayment.data.payUrl,
        qrCodeUrl: momoPayment.data.qrCodeUrl,
        deeplink: momoPayment.data.deeplink
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle MoMo callback (IPN)
// @route   POST /api/v1/payments/momo/callback
// @access  Public
exports.handleMomoCallback = async (req, res, next) => {
  try {
    const callbackData = req.body;
    console.log('\n========== MOMO CALLBACK RECEIVED ==========');
    console.log('Callback Data:', JSON.stringify(callbackData, null, 2));

    // Verify signature (Skip for test environment if needed)
    const isValidSignature = momoService.verifySignature(callbackData);
    console.log('Signature Valid:', isValidSignature);
    
    // TODO: Enable this in production
    // if (!isValidSignature) {
    //   console.error('Invalid MoMo signature');
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Invalid signature'
    //   });
    // }

    const { orderId, resultCode, transId, amount, extraData } = callbackData;
    console.log('Result Code:', resultCode);
    console.log('Extra Data (encoded):', extraData);

    // Decode extraData
    let decodedExtraData = {};
    try {
      if (extraData) {
        decodedExtraData = JSON.parse(Buffer.from(extraData, 'base64').toString());
        console.log('Decoded Extra Data:', decodedExtraData);
      }
    } catch (err) {
      console.error('Error decoding extraData:', err);
    }

    const { payment_id, subscription_id } = decodedExtraData;
    console.log('Payment ID:', payment_id);
    console.log('Subscription ID:', subscription_id);

    // Find payment
    const payment = await Payment.findById(payment_id);
    if (!payment) {
      console.error('Payment not found:', payment_id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment status based on result code
    const paymentStatus = momoService.parseResultCode(resultCode);
    const updateData = {
      payment_status: paymentStatus,
      'gateway_response.response_code': resultCode?.toString(),
      'gateway_response.response_message': momoService.getResultMessage(resultCode),
      'gateway_response.raw_response': callbackData
    };

    if (transId) {
      updateData['gateway_response.transaction_ref'] = transId;
    }

    if (paymentStatus === 'completed') {
      updateData.processed_at = new Date();
      
      // Update subscription status
      if (subscription_id) {
        console.log('Updating subscription:', subscription_id);
        const updatedSubscription = await RecruiterSubscription.findByIdAndUpdate(
          subscription_id,
          {
            payment_status: 'paid',
            subscription_status: 'active'
          },
          { new: true }
        );
        console.log('Subscription updated:', updatedSubscription);
      }
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      updateData.failed_reason = momoService.getResultMessage(resultCode);
      
      // Update subscription to failed
      if (subscription_id) {
        await RecruiterSubscription.findByIdAndUpdate(subscription_id, {
          payment_status: 'failed',
          subscription_status: 'cancelled'
        });
      }
    }

    await Payment.findByIdAndUpdate(payment_id, updateData);

    console.log('Payment updated successfully:', payment_id, paymentStatus);
    console.log('========== CALLBACK PROCESSED ==========\n');

    // Respond to MoMo
    res.status(200).json({
      success: true,
      message: 'Callback processed successfully'
    });
  } catch (error) {
    console.error('MoMo Callback Error:', error);
    next(error);
  }
};

// @desc    Check MoMo payment status
// @route   GET /api/v1/payments/momo/:id/status
// @access  Private
exports.checkMomoPaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      const recruiter = await Recruiter.findOne({ user_id: req.user.id });
      if (!recruiter || payment.recruiter_id.toString() !== recruiter._id.toString()) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to access this payment'
        });
      }
    }

    if (payment.payment_method !== 'momo') {
      return res.status(400).json({
        success: false,
        message: 'This is not a MoMo payment'
      });
    }

    const orderId = payment.gateway_response?.transaction_ref;
    const requestId = `${orderId}_${Date.now()}`;

    // Query MoMo for transaction status
    const statusResult = await momoService.checkTransactionStatus(orderId, requestId);

    if (!statusResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to check payment status',
        error: statusResult.error
      });
    }

    // Update payment if status changed
    const momoStatus = momoService.parseResultCode(statusResult.data.resultCode);
    if (momoStatus !== payment.payment_status) {
      await Payment.findByIdAndUpdate(payment._id, {
        payment_status: momoStatus,
        'gateway_response.response_code': statusResult.data.resultCode?.toString(),
        'gateway_response.response_message': statusResult.data.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        payment_id: payment._id,
        status: momoStatus,
        momo_response: statusResult.data
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund MoMo payment
// @route   POST /api/v1/payments/momo/:id/refund
// @access  Private/Admin
exports.refundMomoPayment = async (req, res, next) => {
  try {
    const { refund_amount, description } = req.body;
    
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.payment_method !== 'momo') {
      return res.status(400).json({
        success: false,
        message: 'This is not a MoMo payment'
      });
    }

    if (payment.payment_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }

    const orderId = payment.gateway_response?.transaction_ref;
    const transId = payment.gateway_response?.raw_response?.transId;

    if (!transId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID not found'
      });
    }

    // Call MoMo refund API
    const refundResult = await momoService.refundTransaction({
      orderId: orderId,
      transId: transId,
      amount: refund_amount || payment.amount,
      description: description
    });

    if (!refundResult.success || refundResult.data.resultCode !== 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to process refund',
        error: refundResult.error || refundResult.data
      });
    }

    // Update payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        payment_status: 'refunded',
        refund_amount: refund_amount || payment.amount,
        refunded_at: new Date(),
        'gateway_response.raw_response.refund': refundResult.data
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Update subscription if needed
    if (payment.subscription_id) {
      await RecruiterSubscription.findByIdAndUpdate(payment.subscription_id, {
        status: 'cancelled',
        payment_status: 'refunded'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedPayment,
      momo_response: refundResult.data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually verify payment status (for testing/recovery)
// @route   POST /api/v1/payments/momo/:id/verify
// @access  Private
exports.verifyMomoPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.payment_method !== 'momo') {
      return res.status(400).json({
        success: false,
        message: 'This is not a MoMo payment'
      });
    }

    const orderId = payment.gateway_response?.transaction_ref;
    const requestId = `${orderId}_verify`;

    // Query MoMo for transaction status
    const statusResult = await momoService.checkTransactionStatus(orderId, requestId);

    if (!statusResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to verify payment status',
        error: statusResult.error
      });
    }

    const resultCode = statusResult.data.resultCode;
    const momoStatus = momoService.parseResultCode(resultCode);

    // Update payment if status changed
    if (momoStatus !== payment.payment_status) {
      const updateData = {
        payment_status: momoStatus,
        'gateway_response.response_code': resultCode?.toString(),
        'gateway_response.response_message': statusResult.data.message,
        'gateway_response.raw_response': statusResult.data
      };

      if (momoStatus === 'completed') {
        updateData.processed_at = new Date();
        
        // Update subscription
        if (payment.subscription_id) {
          await RecruiterSubscription.findByIdAndUpdate(payment.subscription_id, {
            payment_status: 'paid',
            subscription_status: 'active'
          });
        }
      }

      await Payment.findByIdAndUpdate(payment._id, updateData);
    }

    res.status(200).json({
      success: true,
      data: {
        payment_id: payment._id,
        old_status: payment.payment_status,
        new_status: momoStatus,
        momo_response: statusResult.data
      }
    });
  } catch (error) {
    next(error);
  }
};
