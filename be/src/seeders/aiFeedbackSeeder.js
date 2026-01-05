const { AIFeedback, AIRecommendation, User } = require('../models');

async function seedAIFeedback() {
  try {
    console.log('Seeding AI feedback...');
    
    // Get recommendations to create feedback for
    const recommendations = await AIRecommendation.find()
      .where('is_clicked').equals(true)
      .limit(30);
    
    if (recommendations.length === 0) {
      console.log('No recommendations found. Please run AI recommendation seeder first.');
      return [];
    }
    
    const feedbacks = [];
    
    // Positive feedback for clicked recommendations (like)
    for (const rec of recommendations.filter(r => r.is_clicked).slice(0, 10)) {
      const recType = rec.recommendation_type === 'job_for_candidate' ? 'job_recommendation' : 'candidate_recommendation';
      const recModel = rec.recommendation_type === 'job_for_candidate' ? 'AIJobRecommendation' : 'AICandidateRecommendation';
      
      feedbacks.push({
        user_id: rec.requester_id,
        recommendation_id: rec._id,
        recommendation_type: recType,
        recommendation_type_model: recModel,
        feedback_type: 'like',
        rating: 4 + Math.floor(Math.random() * 2),
        comments: [
          'Great recommendation! This is exactly what I was looking for.',
          'Perfect match for my skills and experience.',
          'I applied and got an interview! Thank you.',
          'Very relevant recommendation.',
          'This matches my career goals perfectly.'
        ][Math.floor(Math.random() * 5)],
        is_processed: Math.random() > 0.3,
        processed_at: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null
      });
    }
    
    // Negative feedback - not interested
    for (const rec of recommendations.filter(r => r.is_viewed && !r.is_clicked).slice(0, 8)) {
      const recType = rec.recommendation_type === 'job_for_candidate' ? 'job_recommendation' : 'candidate_recommendation';
      const recModel = rec.recommendation_type === 'job_for_candidate' ? 'AIJobRecommendation' : 'AICandidateRecommendation';
      
      const negativeFeedbackTypes = ['not_interested', 'not_relevant', 'salary_mismatch', 'location_mismatch'];
      const selectedFeedback = negativeFeedbackTypes[Math.floor(Math.random() * negativeFeedbackTypes.length)];
      
      const feedbackComments = {
        not_interested: ['Not interested in this type of position.', 'This doesn\'t match my career goals.'],
        not_relevant: ['This recommendation is not relevant to me.', 'Completely off-target.', 'Skills required don\'t match my profile.'],
        salary_mismatch: ['Salary is too low for my expectations.', 'Pay range doesn\'t meet my requirements.'],
        location_mismatch: ['Location is not convenient for me.', 'Too far from my preferred work location.']
      };
      
      feedbacks.push({
        user_id: rec.requester_id,
        recommendation_id: rec._id,
        recommendation_type: recType,
        recommendation_type_model: recModel,
        feedback_type: selectedFeedback,
        rating: 2 + Math.floor(Math.random() * 2),
        comments: feedbackComments[selectedFeedback][Math.floor(Math.random() * feedbackComments[selectedFeedback].length)],
        is_processed: Math.random() > 0.4,
        processed_at: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null
      });
    }
    
    // Dislike feedback
    for (const rec of recommendations.slice(10, 15)) {
      const recType = rec.recommendation_type === 'job_for_candidate' ? 'job_recommendation' : 'candidate_recommendation';
      const recModel = rec.recommendation_type === 'job_for_candidate' ? 'AIJobRecommendation' : 'AICandidateRecommendation';
      
      feedbacks.push({
        user_id: rec.requester_id,
        recommendation_id: rec._id,
        recommendation_type: recType,
        recommendation_type_model: recModel,
        feedback_type: 'dislike',
        rating: 1 + Math.floor(Math.random() * 2),
        comments: [
          'Please improve the matching algorithm.',
          'Not what I\'m looking for at all.',
          'This doesn\'t fit my profile.'
        ][Math.floor(Math.random() * 3)],
        is_processed: Math.random() > 0.5,
        processed_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000) : null
      });
    }
    
    const createdFeedbacks = await AIFeedback.insertMany(feedbacks);
    console.log(`Created ${createdFeedbacks.length} AI feedbacks`);
    
    return createdFeedbacks;
  } catch (error) {
    console.error('Error seeding AI feedback:', error);
    throw error;
  }
}

module.exports = seedAIFeedback;
