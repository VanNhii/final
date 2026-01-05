const { Recruiter, User } = require('../models');

async function seedRecruiters() {
  try {
    console.log('Seeding recruiters...');
    
    // Get recruiter users
    const recruiterUsers = await User.find({ role: 'recruiter' }).limit(3);
    
    if (recruiterUsers.length === 0) {
      throw new Error('No recruiter users found. Please run user seeder first.');
    }
    
    const recruiterData = [
      {
        user_id: recruiterUsers[0]._id,
        company_name: 'TechViet Solutions',
        company_description: 'Leading software development company specializing in web and mobile applications for international clients.',
        company_size: '100-500',
        industry: 'Information Technology',
        website: 'https://techviet-solutions.com',
        tax_id: 'TV001234567',
        company_address: '123 Nguyễn Huệ, Quận 1, TP.HCM',
        is_verified: true,
        subscription_plan: 'premium',
        plan_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      {
        user_id: recruiterUsers[1]._id,
        company_name: 'InnovateCore Corporation',
        company_description: 'Innovative startup focusing on AI and machine learning solutions for businesses.',
        company_size: '11-50',
        industry: 'Artificial Intelligence',
        website: 'https://innovatecore.com',
        tax_id: 'IC001234567',
        company_address: '456 Lê Lợi, Quận 3, TP.HCM',
        is_verified: true,
        subscription_plan: 'enterprise',
        plan_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      },
      {
        user_id: recruiterUsers[2]._id,
        company_name: 'Digital Dreams Startup',
        company_description: 'Fast-growing startup developing innovative mobile applications and digital platforms.',
        company_size: '1-10',
        industry: 'Mobile Technology',
        website: 'https://digitaldreams.vn',
        tax_id: 'DD001234567',
        company_address: '789 Trần Hưng Đạo, Quận 5, TP.HCM',
        is_verified: false,
        subscription_plan: 'basic',
        plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    ];
    
    const recruiters = await Recruiter.insertMany(recruiterData);
    console.log(`Created ${recruiters.length} recruiters`);
    
    return recruiters;
  } catch (error) {
    console.error('Error seeding recruiters:', error);
    throw error;
  }
}

module.exports = seedRecruiters;
