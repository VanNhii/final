const RecruiterSubscription = require('../models/RecruiterSubscription');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

/**
 * Check and update expired subscriptions
 * This should be run as a scheduled job (e.g., daily)
 */
exports.checkExpiredSubscriptions = async () => {
  try {
    console.log('Checking for expired subscriptions...');
    
    const now = new Date();
    
    // Find subscriptions that are active but past end_date
    const expiredSubscriptions = await RecruiterSubscription.find({
      subscription_status: 'active',
      end_date: { $lt: now }
    }).populate('recruiter_id');
    
    console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);
    
    for (const subscription of expiredSubscriptions) {
      // Update subscription status to expired
      subscription.subscription_status = 'expired';
      await subscription.save();
      
      // Deactivate all featured jobs for this recruiter
      await Job.updateMany(
        { 
          recruiter_id: subscription.recruiter_id._id,
          is_featured: true,
          is_active: true
        },
        { 
          is_featured: false,
          $push: {
            notes: {
              note: 'Featured status removed due to subscription expiry',
              created_at: new Date()
            }
          }
        }
      );
      
      // Create notification for recruiter
      await Notification.create({
        user_id: subscription.recruiter_id.user_id,
        notification_type: 'subscription',
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Please renew to continue using premium features.',
        related_entity_type: 'subscription',
        related_entity_id: subscription._id,
        priority: 'high'
      });
      
      console.log(`Updated subscription ${subscription._id} to expired`);
    }
    
    return {
      success: true,
      count: expiredSubscriptions.length,
      message: `Processed ${expiredSubscriptions.length} expired subscriptions`
    };
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send expiry reminders for subscriptions expiring soon
 * This should be run daily
 */
exports.sendExpiryReminders = async (daysBeforeExpiry = 7) => {
  try {
    console.log(`Sending expiry reminders for subscriptions expiring in ${daysBeforeExpiry} days...`);
    
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysBeforeExpiry * 24 * 60 * 60 * 1000));
    
    // Find active subscriptions expiring in the next X days
    const expiringSubscriptions = await RecruiterSubscription.find({
      subscription_status: 'active',
      payment_status: 'paid',
      end_date: {
        $gte: now,
        $lte: futureDate
      }
    })
    .populate('recruiter_id')
    .populate('service_plan_id');
    
    console.log(`Found ${expiringSubscriptions.length} subscriptions expiring soon`);
    
    for (const subscription of expiringSubscriptions) {
      const daysRemaining = Math.ceil((subscription.end_date - now) / (1000 * 60 * 60 * 24));
      
      // Check if we already sent a reminder recently
      const recentReminder = await Notification.findOne({
        user_id: subscription.recruiter_id.user_id,
        notification_type: 'subscription',
        related_entity_id: subscription._id,
        created_at: { $gte: new Date(now.getTime() - (24 * 60 * 60 * 1000)) }
      });
      
      if (!recentReminder) {
        // Create reminder notification
        await Notification.create({
          user_id: subscription.recruiter_id.user_id,
          notification_type: 'subscription',
          title: 'Subscription Expiring Soon',
          message: `Your ${subscription.service_plan_id?.name || 'subscription'} plan will expire in ${daysRemaining} days. Renew now to continue using premium features.`,
          related_entity_type: 'subscription',
          related_entity_id: subscription._id,
          priority: 'medium',
          action_url: '/recruiter/subscription'
        });
        
        console.log(`Sent expiry reminder for subscription ${subscription._id}`);
      }
    }
    
    return {
      success: true,
      count: expiringSubscriptions.length,
      message: `Sent ${expiringSubscriptions.length} expiry reminders`
    };
  } catch (error) {
    console.error('Error sending expiry reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Clean up pending subscriptions that haven't been paid
 * This should be run daily to clean up abandoned subscriptions
 */
exports.cleanupPendingSubscriptions = async (daysOld = 3) => {
  try {
    console.log(`Cleaning up pending subscriptions older than ${daysOld} days...`);
    
    const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
    
    // Find pending subscriptions created more than X days ago
    const result = await RecruiterSubscription.updateMany(
      {
        subscription_status: 'pending',
        payment_status: 'pending',
        created_at: { $lt: cutoffDate }
      },
      {
        subscription_status: 'cancelled',
        $set: {
          cancelled_at: new Date(),
          cancellation_reason: 'Automatic cancellation - payment not received'
        }
      }
    );
    
    console.log(`Cancelled ${result.modifiedCount} pending subscriptions`);
    
    return {
      success: true,
      count: result.modifiedCount,
      message: `Cancelled ${result.modifiedCount} pending subscriptions`
    };
  } catch (error) {
    console.error('Error cleaning up pending subscriptions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate subscription analytics
 */
exports.getSubscriptionStats = async () => {
  try {
    const now = new Date();
    
    const stats = await RecruiterSubscription.aggregate([
      {
        $facet: {
          active: [
            {
              $match: {
                subscription_status: 'active',
                end_date: { $gt: now }
              }
            },
            { $count: 'count' }
          ],
          expired: [
            {
              $match: {
                subscription_status: 'expired'
              }
            },
            { $count: 'count' }
          ],
          pending: [
            {
              $match: {
                subscription_status: 'pending'
              }
            },
            { $count: 'count' }
          ],
          expiringThisWeek: [
            {
              $match: {
                subscription_status: 'active',
                end_date: {
                  $gte: now,
                  $lte: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
                }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);
    
    return {
      success: true,
      data: {
        active: stats[0].active[0]?.count || 0,
        expired: stats[0].expired[0]?.count || 0,
        pending: stats[0].pending[0]?.count || 0,
        expiringThisWeek: stats[0].expiringThisWeek[0]?.count || 0
      }
    };
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = exports;
