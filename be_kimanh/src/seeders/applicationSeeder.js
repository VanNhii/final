const { Application, Candidate, Job } = require('../models');

async function seedApplications() {
  try {
    console.log('Seeding applications...');
    
    // Get candidates and jobs
    const candidates = await Candidate.find().limit(3);
    const jobs = await Job.find().limit(5);
    
    if (candidates.length === 0 || jobs.length === 0) {
      throw new Error('No candidates or jobs found. Please run candidate and job seeders first.');
    }
    
    const applicationData = [
      {
        candidate_id: candidates[0]._id,
        job_id: jobs[0]._id,
        cover_letter: 'Dear Hiring Manager,\n\nI am excited to apply for the Senior Frontend Developer position at TechViet Solutions. With 3 years of experience in ReactJS development, I believe I would be a great fit for your team.\n\nMy experience includes building responsive web applications, implementing complex state management with Redux, and collaborating with backend teams to integrate APIs. I am passionate about creating user-friendly interfaces and staying up-to-date with the latest frontend technologies.\n\nI would love the opportunity to discuss how my skills and experience can contribute to your team\'s success.\n\nBest regards,\nNguyễn Văn A',
        application_status: 'pending',
        applied_at: new Date(),
        cv_url: '/uploads/cv/candidate1-cv.pdf'
      },
      {
        candidate_id: candidates[1]._id,
        job_id: jobs[1]._id,
        cover_letter: 'Dear InnovateCore Corporation Team,\n\nI am writing to express my strong interest in the AI/Machine Learning Engineer position. With my Master\'s degree in Computer Science and 5 years of experience in backend development, I am eager to transition into the AI field.\n\nI have been self-learning machine learning concepts and have completed several online courses in TensorFlow and PyTorch. My strong programming background in Python and experience with data manipulation make me confident in my ability to contribute to your AI projects.\n\nI am particularly excited about the opportunity to work on cutting-edge AI solutions and would welcome the chance to discuss my qualifications further.\n\nSincerely,\nTrần Thị B',
        application_status: 'reviewing',
        applied_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        cv_url: '/uploads/cv/candidate2-cv.pdf'
      },
      {
        candidate_id: candidates[2]._id,
        job_id: jobs[2]._id,
        cover_letter: 'Hello Digital Dreams Team,\n\nI am thrilled to apply for the Mobile App Developer position. As a mobile developer with 2 years of experience in React Native, I am excited about the opportunity to work with your innovative startup.\n\nI have successfully delivered several cross-platform mobile applications and have experience with both iOS and Android deployment processes. My portfolio includes apps with complex UI/UX requirements and real-time features.\n\nI am drawn to your company\'s mission of creating innovative mobile solutions and would love to contribute to your growing team.\n\nBest regards,\nLê Minh C',
        application_status: 'shortlisted',
        applied_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        cv_url: '/uploads/cv/candidate3-cv.pdf'
      },
      {
        candidate_id: candidates[0]._id,
        job_id: jobs[3]._id,
        cover_letter: 'Dear TechViet Solutions,\n\nI am interested in the Backend Developer position as I would like to expand my skills into backend development. While my primary experience is in frontend, I have been learning Node.js and Express.js in my spare time.\n\nI believe my understanding of how frontend and backend systems interact would be valuable in creating well-integrated applications. I am eager to learn and grow in a backend role.\n\nThank you for considering my application.\n\nRegards,\nNguyễn Văn A',
        application_status: 'rejected',
        applied_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        cv_url: '/uploads/cv/candidate1-cv.pdf',
        rejection_reason: 'Insufficient backend development experience for this senior position.'
      },
      {
        candidate_id: candidates[1]._id,
        job_id: jobs[4]._id,
        cover_letter: 'Dear InnovateCore Corporation,\n\nI would like to apply for the DevOps Engineer position. My backend development experience has given me exposure to deployment processes and cloud platforms, which sparked my interest in DevOps.\n\nI have worked with Docker containers and have basic knowledge of AWS services. I am passionate about automation and infrastructure optimization and would love to transition into a DevOps role.\n\nI am committed to learning and growing in this field and believe my development background would be an asset.\n\nBest regards,\nTrần Thị B',
        application_status: 'interviewed',
        applied_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        cv_url: '/uploads/cv/candidate2-cv.pdf'
      },
      // More successful applications for better training data
      {
        candidate_id: candidates[2]._id,
        job_id: jobs[0]._id,
        cover_letter: 'Dear Hiring Manager,\n\nI am applying for the Frontend Developer position. My React Native experience translates well to web development, and I am eager to expand my skills.\n\nBest regards,\nLê Minh C',
        application_status: 'offered',
        applied_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        cv_url: '/uploads/cv/candidate3-cv.pdf'
      },
      {
        candidate_id: candidates[0]._id,
        job_id: jobs[2]._id,
        cover_letter: 'Dear Digital Dreams,\n\nI am interested in your mobile development position and believe my frontend skills would be valuable.\n\nRegards,\nNguyễn Văn A',
        application_status: 'offered',
        applied_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        cv_url: '/uploads/cv/candidate1-cv.pdf'
      },
      {
        candidate_id: candidates[1]._id,
        job_id: jobs[3]._id,
        cover_letter: 'Dear TechViet,\n\nI am applying for the Backend Developer role with 5 years of experience.\n\nSincerely,\nTrần Thị B',
        application_status: 'shortlisted',
        applied_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        cv_url: '/uploads/cv/candidate2-cv.pdf'
      },
      {
        candidate_id: candidates[2]._id,
        job_id: jobs[4]._id,
        cover_letter: 'Dear InnovateCore,\n\nI am interested in learning DevOps practices.\n\nBest regards,\nLê Minh C',
        application_status: 'rejected',
        applied_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        cv_url: '/uploads/cv/candidate3-cv.pdf',
        rejection_reason: 'Lack of DevOps experience.'
      }
    ];
    
    const applications = await Application.insertMany(applicationData);
    console.log(`Created ${applications.length} applications`);
    
    return applications;
  } catch (error) {
    console.error('Error seeding applications:', error);
    throw error;
  }
}

module.exports = seedApplications;
