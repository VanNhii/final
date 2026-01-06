const { JobCategory } = require('../models');

const jobCategoryData = [
  {
    category_name: 'Frontend Development',
    description: 'Web frontend development with modern frameworks',
    icon: 'fa-code',
    color: '#3498db',
    is_active: true,
    sort_order: 1,
    meta_title: 'Frontend Developer Jobs',
    meta_description: 'Find the best frontend development jobs in Vietnam'
  },
  {
    category_name: 'Backend Development',
    description: 'Server-side development and API creation',
    icon: 'fa-server',
    color: '#2ecc71',
    is_active: true,
    sort_order: 2,
    meta_title: 'Backend Developer Jobs',
    meta_description: 'Explore backend development opportunities'
  },
  {
    category_name: 'Mobile Development',
    description: 'iOS and Android mobile application development',
    icon: 'fa-mobile-alt',
    color: '#e74c3c',
    is_active: true,
    sort_order: 3,
    meta_title: 'Mobile Developer Jobs',
    meta_description: 'Mobile app development career opportunities'
  },
  {
    category_name: 'Data Science',
    description: 'Data analysis, machine learning, and AI',
    icon: 'fa-chart-bar',
    color: '#9b59b6',
    is_active: true,
    sort_order: 4,
    meta_title: 'Data Science Jobs',
    meta_description: 'Data science and analytics job opportunities'
  },
  {
    category_name: 'DevOps',
    description: 'Infrastructure, deployment, and system administration',
    icon: 'fa-cogs',
    color: '#f39c12',
    is_active: true,
    sort_order: 5,
    meta_title: 'DevOps Engineer Jobs',
    meta_description: 'DevOps and infrastructure engineering positions'
  }
];

async function seedJobCategories() {
  try {
    console.log('Seeding job categories...');
    
    // Clear existing categories to avoid duplicates
    await JobCategory.deleteMany({});
    
    const jobCategories = [];
    
    // Use save() instead of insertMany() to trigger pre-save middleware for slug generation
    for (const categoryData of jobCategoryData) {
      const category = new JobCategory(categoryData);
      const savedCategory = await category.save();
      jobCategories.push(savedCategory);
    }
    
    console.log(`Created ${jobCategories.length} job categories`);
    
    return jobCategories;
  } catch (error) {
    console.error('Error seeding job categories:', error);
    throw error;
  }
}

module.exports = seedJobCategories;
