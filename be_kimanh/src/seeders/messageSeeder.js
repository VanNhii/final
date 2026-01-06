const { Message, User } = require('../models');

async function seedMessages() {
  try {
    console.log('Seeding messages...');
    
    // Get users for creating conversations
    const candidates = await User.find({ role: 'candidate' }).limit(3);
    const recruiters = await User.find({ role: 'recruiter' }).limit(3);
    
    if (candidates.length === 0 || recruiters.length === 0) {
      throw new Error('No candidates or recruiters found. Please run user seeder first.');
    }
    
    const messageData = [
      {
        sender_id: candidates[0]._id,
        receiver_id: recruiters[0]._id,
        subject: 'Question about Frontend Developer Position',
        content: 'Hello! I have a question about the Senior Frontend Developer position. Could you please provide more details about the team structure and the specific projects I would be working on?',
        message_type: 'job_inquiry',
        is_read: false
      },
      {
        sender_id: recruiters[0]._id,
        receiver_id: candidates[0]._id,
        subject: 'Re: Question about Frontend Developer Position',
        content: 'Hi Nguyễn Văn A! Thank you for your interest. Our frontend team consists of 5 developers working on various client projects. You would primarily work on React-based web applications for international clients. The team follows agile methodology and emphasizes code quality and best practices.',
        message_type: 'job_inquiry',
        is_read: true
      },
      {
        sender_id: recruiters[1]._id,
        receiver_id: candidates[1]._id,
        subject: 'Interview Invitation - AI/ML Engineer Position',
        content: 'Dear Trần Thị B,\n\nWe are impressed with your application for the AI/Machine Learning Engineer position. We would like to invite you for a technical interview.\n\nPlease let us know your availability for next week. The interview will be conducted via Google Meet and will last approximately 60 minutes.\n\nLooking forward to hearing from you.\n\nBest regards,\nInnovateCore Corporation HR Team',
        message_type: 'interview_invitation',
        is_read: false
      },
      {
        sender_id: candidates[1]._id,
        receiver_id: recruiters[1]._id,
        subject: 'Re: Interview Invitation - AI/ML Engineer Position',
        content: 'Dear Hiring Team,\n\nThank you for the interview invitation. I am very excited about this opportunity. I am available for the interview on the following dates:\n\n- Monday, next week at 2:00 PM\n- Tuesday, next week at 10:00 AM\n- Wednesday, next week at 3:00 PM\n\nPlease let me know which time works best for you. I look forward to discussing my qualifications further.\n\nBest regards,\nTrần Thị B',
        message_type: 'interview_invitation',
        is_read: true
      },
      {
        sender_id: candidates[2]._id,
        receiver_id: recruiters[2]._id,
        subject: 'Thank You - Mobile Developer Position',
        content: 'Hello,\n\nI wanted to thank you for considering my application for the Mobile App Developer position. I am very interested in joining Digital Dreams Startup and contributing to your innovative mobile solutions.\n\nIf you need any additional information or have any questions about my experience, please feel free to reach out.\n\nBest regards,\nLê Minh C',
        message_type: 'application_followup',
        is_read: false
      }
    ];
    
    const messages = await Message.insertMany(messageData);
    console.log(`Created ${messages.length} messages`);
    
    return messages;
  } catch (error) {
    console.error('Error seeding messages:', error);
    throw error;
  }
}

module.exports = seedMessages;
