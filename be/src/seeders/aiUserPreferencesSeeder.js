const { AIUserPreferences, Candidate, User } = require('../models');

async function seedAIUserPreferences() {
  try {
    console.log('Seeding AI user preferences...');
    
    // Get candidates with their users
    const candidates = await Candidate.find().populate('user_id').limit(10);
    
    if (candidates.length === 0) {
      console.log('No candidates found. Please run candidate seeder first.');
      return [];
    }
    
    const preferences = [];
    
    const jobTypes = ['full_time', 'part_time', 'contract', 'internship'];
    const experienceLevels = ['junior', 'mid_level', 'senior', 'lead'];
    const workLocations = ['onsite', 'remote', 'hybrid', 'flexible'];
    const industries = ['Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce'];
    
    for (const candidate of candidates) {
      if (!candidate.user_id) continue;
      
      const randomJobTypes = jobTypes.filter(() => Math.random() > 0.5);
      const randomIndustries = industries.filter(() => Math.random() > 0.6);
      const minSalary = 10000000 + Math.floor(Math.random() * 20000000);
      const maxSalary = minSalary + 10000000 + Math.floor(Math.random() * 20000000);
      
      // Create job preferences
      preferences.push({
        user_id: candidate.user_id._id,
        preference_type: 'job_preferences',
        preference_data: {
          preferred_job_types: randomJobTypes.length > 0 ? randomJobTypes : ['full_time'],
          preferred_locations: [
            candidate.location || 'Ho Chi Minh City',
            Math.random() > 0.7 ? 'Ha Noi' : 'Da Nang'
          ],
          preferred_industries: randomIndustries.length > 0 ? randomIndustries : ['Technology'],
          preferred_salary_range: {
            min: minSalary,
            max: maxSalary
          },
          work_arrangement: workLocations[Math.floor(Math.random() * workLocations.length)]
        },
        weight: 0.8 + Math.random() * 0.2,
        is_active: true
      });
      
      // Create notification preferences
      preferences.push({
        user_id: candidate.user_id._id,
        preference_type: 'notification_preferences',
        preference_data: {
          email_notifications: {
            job_recommendations: Math.random() > 0.2,
            application_updates: Math.random() > 0.1,
            interview_reminders: Math.random() > 0.05,
            newsletter: Math.random() > 0.6
          },
          push_notifications: Math.random() > 0.3
        },
        weight: 1.0,
        is_active: true
      });
      
      // Create recommendation settings
      preferences.push({
        user_id: candidate.user_id._id,
        preference_type: 'recommendation_settings',
        preference_data: {
          recommendation_frequency: ['daily', 'weekly', 'bi_weekly', 'monthly'][Math.floor(Math.random() * 4)],
          max_recommendations_per_batch: 5 + Math.floor(Math.random() * 15) // 5-20
        },
        weight: 1.0,
        is_active: Math.random() > 0.2 // 80% active
      });
    }
    
    if (preferences.length > 0) {
      const createdPreferences = await AIUserPreferences.insertMany(preferences);
      console.log(`Created ${createdPreferences.length} AI user preferences (${preferences.length / 3} users x 3 preference types)`);
      return createdPreferences;
    } else {
      console.log('No preferences to create');
      return [];
    }
  } catch (error) {
    console.error('Error seeding AI user preferences:', error);
    throw error;
  }
}

module.exports = seedAIUserPreferences;
