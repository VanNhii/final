const cron = require('node-cron');
const {
  checkExpiredSubscriptions,
  sendExpiryReminders,
  cleanupPendingSubscriptions
} = require('./utils/subscriptionChecker');

/**
 * Initialize scheduled jobs for subscription management
 */
const initializeScheduledJobs = () => {
  console.log('Initializing scheduled jobs...');

  // Check for expired subscriptions every day at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('\n===== Running Subscription Expiry Check =====');
    console.log(new Date().toISOString());
    
    try {
      const result = await checkExpiredSubscriptions();
      console.log('Expiry check result:', result);
    } catch (error) {
      console.error('Error in expiry check:', error);
    }
    
    console.log('===== Expiry Check Complete =====\n');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Send expiry reminders every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('\n===== Sending Subscription Expiry Reminders =====');
    console.log(new Date().toISOString());
    
    try {
      // Send reminders for subscriptions expiring in 7 days
      const result7Days = await sendExpiryReminders(7);
      console.log('7-day reminder result:', result7Days);
      
      // Send reminders for subscriptions expiring in 3 days
      const result3Days = await sendExpiryReminders(3);
      console.log('3-day reminder result:', result3Days);
      
      // Send reminders for subscriptions expiring in 1 day
      const result1Day = await sendExpiryReminders(1);
      console.log('1-day reminder result:', result1Day);
    } catch (error) {
      console.error('Error sending reminders:', error);
    }
    
    console.log('===== Reminders Complete =====\n');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });

  // Clean up pending subscriptions every day at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('\n===== Cleaning Up Pending Subscriptions =====');
    console.log(new Date().toISOString());
    
    try {
      const result = await cleanupPendingSubscriptions(3);
      console.log('Cleanup result:', result);
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
    
    console.log('===== Cleanup Complete =====\n');
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });

  console.log('Scheduled jobs initialized successfully:');
  console.log('- Expiry check: Daily at 1:00 AM');
  console.log('- Expiry reminders: Daily at 9:00 AM');
  console.log('- Cleanup pending: Daily at 2:00 AM');
};

module.exports = { initializeScheduledJobs };
