const { Interview, Application, Recruiter, Candidate } = require('../models');

async function seedInterviews() {
  try {
    console.log('Seeding interviews...');
    
        // Get applications that are shortlisted or reviewed
    const applications = await Application.find({ 
      application_status: { $in: ['shortlisted', 'reviewing'] } 
    }).populate('candidate_id').populate('job_id').limit(3);
    
    const recruiters = await Recruiter.find().limit(3);
    
    if (applications.length === 0) {
      console.log('No suitable applications found for interviews. Skipping interview seeding.');
      return [];
    }
    
    if (recruiters.length === 0) {
      throw new Error('No recruiters found. Please run recruiter seeder first.');
    }
    
    const interviewData = [
      {
        application_id: applications[0]._id,
        recruiter_id: recruiters[0]._id,
        candidate_id: applications[0].candidate_id._id,
        interview_type: 'phone',
        interview_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        interview_time: '14:00',
        duration_minutes: 30,
        location: 'Phone call',
        meeting_link: null, // No meeting link for phone interviews
        status: 'scheduled',
        notes: 'Initial phone screening to discuss basic qualifications and interest level.'
      },
      {
        application_id: applications[1]._id,
        recruiter_id: recruiters[1]._id,
        candidate_id: applications[1].candidate_id._id,
        interview_type: 'video',
        interview_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        interview_time: '10:00',
        duration_minutes: 60,
        location: 'Online - Google Meet',
        meeting_link: 'https://meet.google.com/abc-defg-hij',
        status: 'scheduled',
        notes: 'Technical interview focusing on AI/ML concepts and Python programming skills.'
      },
      {
        application_id: applications[2] ? applications[2]._id : applications[0]._id,
        recruiter_id: recruiters[2]._id,
        candidate_id: applications[2] ? applications[2].candidate_id._id : applications[0].candidate_id._id,
        interview_type: 'onsite',
        interview_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        interview_time: '15:30',
        duration_minutes: 90,
        location: '789 Trần Hưng Đạo, Quận 5, TP.HCM - Meeting Room A',
        meeting_link: null, // No meeting link for onsite interviews
        status: 'scheduled',
        notes: 'Final round interview including technical assessment and cultural fit evaluation.'
      }
    ];    // Only create interviews for applications that exist
    const validInterviewData = interviewData.filter((_, index) => index < applications.length);
    
    const interviews = await Interview.insertMany(validInterviewData);
    console.log(`Created ${interviews.length} interviews`);
    
    return interviews;
  } catch (error) {
    console.error('Error seeding interviews:', error);
    throw error;
  }
}

module.exports = seedInterviews;
