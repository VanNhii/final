const { Candidate, User } = require('../models');

async function seedCandidates() {
  try {
    console.log('Seeding candidates...');
    
    // Get candidate users
    const candidateUsers = await User.find({ role: 'candidate' }).limit(3);
    
    if (candidateUsers.length === 0) {
      throw new Error('No candidate users found. Please run user seeder first.');
    }
    
    const candidateData = [
      {
        user_id: candidateUsers[0]._id,
        date_of_birth: new Date('1995-03-15'),
        gender: 'male',
        address: '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
        city: 'Hồ Chí Minh',
        education_level: 'bachelor',
        experience_years: 3,
        skills: ['JavaScript', 'ReactJS', 'NodeJS', 'MongoDB', 'HTML/CSS'],
        bio: 'Passionate frontend developer with 3 years of experience in modern web technologies.',
        linkedin_url: 'https://linkedin.com/in/nguyen-van-a',
        github_url: 'https://github.com/nguyen-van-a',
        portfolio_url: 'https://portfolio-nguyenvana.com',
        salary_expectation: {
          min: 15000000,
          max: 25000000,
          currency: 'VND'
        },
        job_status: 'seeking'
      },
      {
        user_id: candidateUsers[1]._id,
        date_of_birth: new Date('1993-07-22'),
        gender: 'female',
        address: '456 Lê Văn Việt, Quận 9, TP.HCM',
        city: 'Hồ Chí Minh',
        education_level: 'master',
        experience_years: 5,
        skills: ['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker'],
        bio: 'Backend developer with expertise in Python and cloud technologies.',
        linkedin_url: 'https://linkedin.com/in/tran-thi-b',
        github_url: 'https://github.com/tran-thi-b',
        salary_expectation: {
          min: 20000000,
          max: 35000000,
          currency: 'VND'
        },
        job_status: 'seeking'
      },
      {
        user_id: candidateUsers[2]._id,
        date_of_birth: new Date('1997-11-08'),
        gender: 'male',
        address: '789 Võ Văn Ngân, Thủ Đức, TP.HCM',
        city: 'Hồ Chí Minh',
        education_level: 'bachelor',
        experience_years: 2,
        skills: ['React Native', 'Flutter', 'Dart', 'Firebase', 'iOS', 'Android'],
        bio: 'Mobile developer specializing in cross-platform applications.',
        linkedin_url: 'https://linkedin.com/in/le-minh-c',
        github_url: 'https://github.com/le-minh-c',
        portfolio_url: 'https://leminhc-portfolio.com',
        salary_expectation: {
          min: 12000000,
          max: 20000000,
          currency: 'VND'
        },
        job_status: 'seeking'
      }
    ];
    
    const candidates = await Candidate.insertMany(candidateData);
    console.log(`Created ${candidates.length} candidates`);
    
    return candidates;
  } catch (error) {
    console.error('Error seeding candidates:', error);
    throw error;
  }
}

module.exports = seedCandidates;
