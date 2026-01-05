const { AIRecommendation, Application, Candidate, Job } = require('../models');

async function seedAIRecommendations() {
  try {
    console.log('Seeding AI recommendations...');
    
    // Get some applications to base recommendations on
    const applications = await Application.find()
      .populate('candidate_id')
      .populate('job_id')
      .limit(20);
    
    const candidates = await Candidate.find().limit(10);
    const jobs = await Job.find().limit(20);
    
    if (applications.length === 0 || candidates.length === 0 || jobs.length === 0) {
      console.log('Not enough data to seed AI recommendations. Please run other seeders first.');
      return [];
    }
    
    const recommendations = [];
    
    // Create recommendations based on applications (high scores for applied jobs)
    for (const app of applications.slice(0, 10)) {
      if (!app.candidate_id || !app.job_id) continue;
      
      recommendations.push({
        requester_id: app.candidate_id.user_id,
        requester_type: 'candidate',
        recommendation_type: 'job_for_candidate',
        recommended_entity_id: app.job_id._id,
        recommended_entity_type: 'Job',
        score: 0.85 + Math.random() * 0.15,
        confidence: 0.80 + Math.random() * 0.15,
        algorithm_version: 'v1.0',
        reasons: [
          {
            factor: 'skills_match',
            weight: 0.4,
            score: 0.85 + Math.random() * 0.15,
            description: 'Your skills match this position'
          },
          {
            factor: 'salary_match',
            weight: 0.3,
            score: 0.80 + Math.random() * 0.15,
            description: 'Salary range aligns with expectations'
          },
          {
            factor: 'experience_match',
            weight: 0.3,
            score: 0.82 + Math.random() * 0.15,
            description: 'Experience level is a good fit'
          }
        ],
        is_viewed: app.application_status !== 'pending',
        viewed_at: app.application_status !== 'pending' ? app.applied_at : null,
        is_clicked: true,
        clicked_at: app.applied_at,
        is_active: true
      });
    }
    
    // Create recommendations for candidates who haven't applied (medium-high scores)
    for (const candidate of candidates.slice(0, 5)) {
      const randomJobs = jobs
        .filter(job => !applications.find(app => 
          app.candidate_id && app.candidate_id._id.toString() === candidate._id.toString() && 
          app.job_id && app.job_id._id.toString() === job._id.toString()
        ))
        .slice(0, 5);
      
      for (const job of randomJobs) {
        const score = 0.65 + Math.random() * 0.25;
        const isViewed = Math.random() > 0.5;
        const isClicked = isViewed && Math.random() > 0.6;
        
        recommendations.push({
          requester_id: candidate.user_id,
          requester_type: 'candidate',
          recommendation_type: 'job_for_candidate',
          recommended_entity_id: job._id,
          recommended_entity_type: 'Job',
          score: score,
          confidence: 0.70 + Math.random() * 0.20,
          algorithm_version: 'v1.0',
          reasons: [
            {
              factor: 'skills_match',
              weight: 0.35,
              score: score > 0.80 ? 0.85 : 0.70,
              description: score > 0.80 ? 'Strong skills match' : 'Good skills match'
            },
            {
              factor: 'location_match',
              weight: 0.35,
              score: 0.75 + Math.random() * 0.15,
              description: 'Location matches your preference'
            },
            {
              factor: 'industry_match',
              weight: 0.30,
              score: 0.70 + Math.random() * 0.20,
              description: 'Company culture fits your profile'
            }
          ],
          is_viewed: isViewed,
          viewed_at: isViewed ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          is_clicked: isClicked,
          clicked_at: isClicked ? new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000) : null,
          is_active: true
        });
      }
    }
    
    // Create candidate recommendations for jobs (recruiter view)
    for (const job of jobs.slice(0, 5)) {
      const suitableCandidates = candidates.slice(0, 5);
      
      for (const candidate of suitableCandidates) {
        const score = 0.70 + Math.random() * 0.25;
        
        recommendations.push({
          requester_id: job.recruiter_id,
          requester_type: 'recruiter',
          recommendation_type: 'candidate_for_job',
          recommended_entity_id: candidate._id,
          recommended_entity_type: 'Candidate',
          context_job_id: job._id,
          score: score,
          confidence: 0.75 + Math.random() * 0.20,
          algorithm_version: 'v1.0',
          reasons: [
            {
              factor: 'experience_match',
              weight: 0.4,
              score: 0.75 + Math.random() * 0.20,
              description: 'Experience level matches job requirements'
            },
            {
              factor: 'skills_match',
              weight: 0.4,
              score: 0.70 + Math.random() * 0.25,
              description: 'Skills align with position needs'
            },
            {
              factor: 'past_performance',
              weight: 0.2,
              score: 0.80 + Math.random() * 0.15,
              description: 'High application success rate'
            }
          ],
          is_active: true
        });
      }
    }
    
    const createdRecommendations = await AIRecommendation.insertMany(recommendations);
    console.log(`Created ${createdRecommendations.length} AI recommendations`);
    
    return createdRecommendations;
  } catch (error) {
    console.error('Error seeding AI recommendations:', error);
    throw error;
  }
}

module.exports = seedAIRecommendations;
