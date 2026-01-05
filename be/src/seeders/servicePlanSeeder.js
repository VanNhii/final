const { ServicePlan } = require('../models');

async function seedServicePlans() {
  try {
    console.log('Seeding service plans...');
    
    const servicePlanData = [
      {
        name: 'Basic',
        description: 'Perfect for small companies and startups',
        price: 0,
        duration_days: 30,
        plan_type: 'basic',
        features: {
          job_posts_limit: 3,
          featured_jobs: 0,
          candidate_search: true,
          advanced_analytics: false,
          priority_support: false,
          cv_downloads: 50
        },
        is_active: true,
        sort_order: 1,
        is_popular: false,
        color: '#6c757d'
      },
      {
        name: 'Premium',
        description: 'Ideal for growing companies with regular hiring needs',
        price: 500000,
        duration_days: 30,
        plan_type: 'premium',
        features: {
          job_posts_limit: 15,
          featured_jobs: 3,
          candidate_search: true,
          advanced_analytics: true,
          priority_support: true,
          cv_downloads: 200
        },
        is_active: true,
        sort_order: 2,
        is_popular: true,
        color: '#007bff'
      },
      {
        name: 'Enterprise',
        description: 'For large organizations with extensive hiring requirements',
        price: 1500000,
        duration_days: 30,
        plan_type: 'enterprise',
        features: {
          job_posts_limit: 999,
          featured_jobs: 999,
          candidate_search: true,
          advanced_analytics: true,
          priority_support: true,
          cv_downloads: 999
        },
        is_active: true,
        sort_order: 3,
        is_popular: false,
        color: '#28a745'
      },
      {
        name: 'Trial',
        description: 'Free trial for new companies to test our platform',
        price: 0,
        duration_days: 14,
        plan_type: 'basic',
        features: {
          job_posts_limit: 1,
          featured_jobs: 0,
          candidate_search: false,
          advanced_analytics: false,
          priority_support: false,
          cv_downloads: 10
        },
        is_active: true,
        sort_order: 0,
        is_popular: false,
        color: '#ffc107'
      },
      {
        name: 'Startup Special',
        description: 'Special discounted plan for verified startups',
        price: 250000,
        duration_days: 30,
        plan_type: 'premium',
        features: {
          job_posts_limit: 8,
          featured_jobs: 1,
          candidate_search: true,
          advanced_analytics: true,
          priority_support: true,
          cv_downloads: 100
        },
        is_active: true,
        sort_order: 4,
        is_popular: false,
        color: '#17a2b8'
      }
    ];    const servicePlans = await ServicePlan.insertMany(servicePlanData);
    console.log(`Created ${servicePlans.length} service plans`);
    
    return servicePlans;
  } catch (error) {
    console.error('Error seeding service plans:', error);
    throw error;
  }
}

module.exports = seedServicePlans;
