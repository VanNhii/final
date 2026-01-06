const { Job, Recruiter, JobCategory } = require('../models');

async function seedJobs() {
  try {
    console.log('Seeding jobs...');
    
    // Get recruiters and job categories
    const recruiters = await Recruiter.find().limit(3);
    const jobCategories = await JobCategory.find().limit(5);
    
    if (recruiters.length === 0) {
      throw new Error('No recruiters found. Please run recruiter seeder first.');
    }
    
    if (jobCategories.length === 0) {
      throw new Error('No job categories found. Please run job category seeder first.');
    }
    
    const jobData = [
      {
        recruiter_id: recruiters[0]._id,
        title: 'Senior Frontend Developer (ReactJS)',
        description: 'We are looking for an experienced Frontend Developer to join our dynamic team. You will be responsible for developing user-facing web applications using modern JavaScript frameworks, primarily ReactJS. The ideal candidate should have strong experience with component-based architecture, state management, and responsive design.',
        requirements: 'Requirements:\n- Bachelor\'s degree in Computer Science or related field\n- 3+ years of experience with ReactJS\n- Proficiency in JavaScript ES6+, HTML5, CSS3\n- Experience with Redux or Context API\n- Knowledge of RESTful APIs and GraphQL\n- Familiarity with Git version control\n- Strong problem-solving skills',
        benefits: 'Benefits:\n- Competitive salary 15-25M VND\n- Health insurance\n- 13th month bonus\n- Flexible working hours\n- Professional development opportunities\n- Modern working environment',
        salary_min: 15000000,
        salary_max: 25000000,
        salary_currency: 'VND',
        job_type: 'full_time',
        work_location: 'hybrid',
        location: {
          address: '123 Nguyễn Huệ, Quận 1',
          city: 'Hồ Chí Minh',
          country: 'Vietnam'
        },
        experience_required: {
          min: 3,
          max: 7
        },
        education_required: 'bachelor',
        skills_required: [
          { skill_name: 'ReactJS', is_required: true, weight: 10 },
          { skill_name: 'JavaScript', is_required: true, weight: 9 },
          { skill_name: 'HTML/CSS', is_required: true, weight: 8 },
          { skill_name: 'Redux', is_required: false, weight: 7 }
        ],
        application_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_active: true,
        status: 'approved',
        company_name: 'TechViet Solutions',
        category_id: jobCategories[0]._id, // Frontend Development
        categories: [jobCategories[0]._id],
        is_featured: true
      },
      {
        recruiter_id: recruiters[1]._id,
        title: 'AI/Machine Learning Engineer',
        description: 'Join our AI team to develop cutting-edge machine learning solutions. You will work on projects involving natural language processing, computer vision, and predictive analytics. We are looking for someone passionate about AI and eager to work with the latest technologies in a fast-paced environment.',
        requirements: 'Requirements:\n- Master\'s degree in Computer Science, AI, or related field\n- 2+ years of experience in machine learning\n- Proficiency in Python, TensorFlow, PyTorch\n- Experience with data preprocessing and analysis\n- Knowledge of deep learning architectures\n- Strong mathematical and statistical background',
        benefits: 'Benefits:\n- Attractive salary 20-35M VND\n- Stock options\n- Health and life insurance\n- Learning budget for courses and conferences\n- Cutting-edge hardware and tools\n- Collaborative and innovative work environment',
        salary_min: 20000000,
        salary_max: 35000000,
        salary_currency: 'VND',
        job_type: 'full_time',
        work_location: 'onsite',
        location: {
          address: '456 Lê Lợi, Quận 3',
          city: 'Hồ Chí Minh',
          country: 'Vietnam'
        },
        experience_required: {
          min: 2,
          max: 5
        },
        education_required: 'master',
        skills_required: [
          { skill_name: 'Python', is_required: true, weight: 10 },
          { skill_name: 'TensorFlow', is_required: true, weight: 9 },
          { skill_name: 'Machine Learning', is_required: true, weight: 10 },
          { skill_name: 'PyTorch', is_required: false, weight: 8 }
        ],
        application_deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        is_active: true,
        status: 'approved',
        company_name: 'InnovateCore Corporation',
        category_id: jobCategories[3]._id, // Data Science
        categories: [jobCategories[3]._id],
        is_featured: true
      },
      {
        recruiter_id: recruiters[2]._id,
        title: 'Mobile App Developer (React Native)',
        description: 'We are seeking a talented Mobile Developer to create amazing mobile applications for iOS and Android platforms. You will work with React Native to build cross-platform mobile apps that deliver exceptional user experiences.',
        requirements: 'Requirements:\n- Bachelor\'s degree or equivalent experience\n- 2+ years of React Native development\n- Experience with mobile app deployment (App Store, Google Play)\n- Knowledge of native mobile development (iOS/Android)\n- Familiarity with mobile UI/UX principles\n- Experience with mobile app testing and debugging',
        benefits: 'Benefits:\n- Competitive salary 12-20M VND\n- Yearly bonus based on performance\n- Health insurance coverage\n- Flexible working arrangements\n- Career growth opportunities\n- Young and dynamic team environment',
        salary_min: 12000000,
        salary_max: 20000000,
        salary_currency: 'VND',
        job_type: 'full_time',
        work_location: 'remote',
        location: {
          address: '789 Trần Hưng Đạo, Quận 5',
          city: 'Hồ Chí Minh',
          country: 'Vietnam'
        },
        experience_required: {
          min: 2,
          max: 4
        },
        education_required: 'bachelor',
        skills_required: [
          { skill_name: 'React Native', is_required: true, weight: 10 },
          { skill_name: 'JavaScript', is_required: true, weight: 9 },
          { skill_name: 'iOS Development', is_required: false, weight: 7 },
          { skill_name: 'Android Development', is_required: false, weight: 7 }
        ],
        application_deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        is_active: true,
        status: 'pending',
        company_name: 'Digital Dreams Startup',
        category_id: jobCategories[2]._id, // Mobile Development
        categories: [jobCategories[2]._id],
        is_featured: false
      },
      {
        recruiter_id: recruiters[0]._id,
        title: 'Backend Developer (Node.js)',
        description: 'Looking for a skilled Backend Developer to design and implement server-side applications. You will work with Node.js and related technologies to build scalable and robust APIs that power our web and mobile applications.',
        requirements: 'Requirements:\n- Bachelor\'s degree in Computer Science\n- 3+ years of Node.js development experience\n- Experience with Express.js framework\n- Knowledge of databases (MongoDB, PostgreSQL)\n- Understanding of RESTful API design\n- Experience with cloud platforms (AWS, Azure)\n- Knowledge of microservices architecture',
        benefits: 'Benefits:\n- Salary range 18-28M VND\n- Performance bonuses\n- Comprehensive health insurance\n- Professional training and certification\n- Modern office facilities\n- Team building activities',
        salary_min: 18000000,
        salary_max: 28000000,
        salary_currency: 'VND',
        job_type: 'full_time',
        work_location: 'hybrid',
        location: {
          address: '123 Nguyễn Huệ, Quận 1',
          city: 'Hồ Chí Minh',
          country: 'Vietnam'
        },
        experience_required: {
          min: 3,
          max: 6
        },
        education_required: 'bachelor',
        skills_required: [
          { skill_name: 'Node.js', is_required: true, weight: 10 },
          { skill_name: 'Express.js', is_required: true, weight: 9 },
          { skill_name: 'MongoDB', is_required: true, weight: 8 },
          { skill_name: 'AWS', is_required: false, weight: 7 }
        ],
        application_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        is_active: true,
        status: 'approved',
        company_name: 'TechViet Solutions',
        category_id: jobCategories[1]._id, // Backend Development
        categories: [jobCategories[1]._id],
        is_featured: false
      },
      {
        recruiter_id: recruiters[1]._id,
        title: 'DevOps Engineer',
        description: 'We are looking for a DevOps Engineer to help us build and maintain our infrastructure. You will be responsible for automating deployment processes, managing cloud infrastructure, and ensuring the reliability and scalability of our systems.',
        requirements: 'Requirements:\n- Bachelor\'s degree in Computer Science or related field\n- 2+ years of DevOps experience\n- Experience with containerization (Docker, Kubernetes)\n- Knowledge of CI/CD pipelines\n- Proficiency in scripting (Bash, Python)\n- Experience with cloud platforms (AWS, GCP, Azure)\n- Understanding of infrastructure as code (Terraform, CloudFormation)',
        benefits: 'Benefits:\n- Competitive salary 22-32M VND\n- Annual performance review and salary adjustment\n- Health insurance for family\n- Professional development budget\n- Latest technology and equipment\n- Flexible work schedule',
        salary_min: 22000000,
        salary_max: 32000000,
        salary_currency: 'VND',
        job_type: 'full_time',
        work_location: 'onsite',
        location: {
          address: '456 Lê Lợi, Quận 3',
          city: 'Hồ Chí Minh',
          country: 'Vietnam'
        },
        experience_required: {
          min: 2,
          max: 5
        },
        education_required: 'bachelor',
        skills_required: [
          { skill_name: 'Docker', is_required: true, weight: 9 },
          { skill_name: 'Kubernetes', is_required: true, weight: 9 },
          { skill_name: 'AWS', is_required: true, weight: 8 },
          { skill_name: 'Terraform', is_required: false, weight: 7 }
        ],
        application_deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        is_active: true,
        status: 'approved',
        company_name: 'InnovateCore Corporation',
        category_id: jobCategories[4]._id, // DevOps
        categories: [jobCategories[4]._id],
        is_featured: true
      }
    ];
    
    const jobs = await Job.insertMany(jobData);
    console.log(`Created ${jobs.length} jobs`);
    
    return jobs;
  } catch (error) {
    console.error('Error seeding jobs:', error);
    throw error;
  }
}

module.exports = seedJobs;
