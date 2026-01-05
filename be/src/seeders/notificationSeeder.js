const { Notification, User, Job, Application } = require('../models');

async function seedNotifications() {
  try {
    console.log('Seeding notifications...');
    
    // Get users, jobs, and applications for creating realistic notifications
    const users = await User.find().limit(7);
    const jobs = await Job.find().limit(3);
    const applications = await Application.find().limit(3);
    
    if (users.length === 0) {
      throw new Error('No users found. Please run user seeder first.');
    }
    
    const notificationData = [
      {
        user_id: users.find(u => u.role === 'candidate')._id,
        title: 'Application Received',
        message: 'Your application for Senior Frontend Developer position has been received and is under review.',
        notification_type: 'application_update',
        related_entity_type: 'Application',
        related_entity_id: applications[0] ? applications[0]._id : null,
        is_read: false,
        priority: 'medium'
      },
      {
        user_id: users.find(u => u.role === 'candidate')._id,
        title: 'Interview Scheduled',
        message: 'You have been scheduled for an interview for the AI/Machine Learning Engineer position on ' + new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        notification_type: 'interview_reminder',
        related_entity_type: 'Application',
        related_entity_id: applications[1] ? applications[1]._id : null,
        is_read: false,
        priority: 'high'
      },
      {
        user_id: users.find(u => u.role === 'recruiter')._id,
        title: 'New Application Received',
        message: 'A new application has been submitted for your Mobile App Developer position.',
        notification_type: 'application_update',
        related_entity_type: 'Application',
        related_entity_id: applications[2] ? applications[2]._id : null,
        is_read: true,
        priority: 'medium'
      },
      {
        user_id: users.find(u => u.role === 'admin')._id,
        title: 'Job Posting Pending Review',
        message: 'A new job posting "Mobile App Developer (React Native)" is pending admin review.',
        notification_type: 'system_announcement',
        related_entity_type: 'Job',
        related_entity_id: jobs[2] ? jobs[2]._id : null,
        is_read: false,
        priority: 'high'
      },
      {
        user_id: users.filter(u => u.role === 'candidate')[1]._id,
        title: 'Profile Views Increased',
        message: 'Your profile has been viewed by 5 recruiters this week. Consider updating your skills to attract more opportunities.',
        notification_type: 'job_recommendation',
        is_read: true,
        priority: 'low'
      }
    ];
    
    const notifications = await Notification.insertMany(notificationData);
    console.log(`Created ${notifications.length} notifications`);
    
    return notifications;
  } catch (error) {
    console.error('Error seeding notifications:', error);
    throw error;
  }
}

module.exports = seedNotifications;
