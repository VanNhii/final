/**
 * Data mapping utilities for converting between frontend and backend data formats
 */

/**
 * Convert backend Job data to frontend format
 * @param {Object} backendJob - Job data from MongoDB
 * @returns {Object} Frontend-formatted job data
 */
export const mapJobToFrontend = (backendJob) => {
  if (!backendJob) return null;

  return {
    id: backendJob._id,
    title: backendJob.title,
    company: backendJob.company_name || backendJob.recruiter_id?.company_name,
    companyLogo: backendJob.recruiter_id?.logo_url || '/images/companies/default.jpg',
    location: backendJob.location?.city || 'Remote',
    jobType: mapJobTypeToFrontend(backendJob.job_type),
    experience: mapExperienceToFrontend(backendJob.seniority_level),
    salaryMin: backendJob.salary_min,
    salaryMax: backendJob.salary_max,
    salaryCurrency: backendJob.salary_currency || 'VND',
    postedDate: backendJob.created_at,
    deadline: backendJob.application_deadline,
    description: backendJob.description,
    requirements: Array.isArray(backendJob.requirements) ? backendJob.requirements : [backendJob.requirements],
    niceToHave: backendJob.nice_to_have_skills?.map(skill => skill.skill_name) || [],
    benefits: Array.isArray(backendJob.benefits) ? backendJob.benefits : (backendJob.benefits ? [backendJob.benefits] : []),
    tags: backendJob.tags || backendJob.skills_required?.map(skill => skill.skill_name) || [],
    isHot: backendJob.is_hot || false,
    isUrgent: backendJob.is_urgent || false,
    isFeatured: backendJob.is_featured || false,
    category: backendJob.category_id?.category_name || backendJob.categories?.[0]?.category_name,
    views: backendJob.views_count || 0,
    applicants: backendJob.applications_count || 0,
    workLocation: backendJob.work_location,
    positionsAvailable: backendJob.positions_available || 1,
    companyInfo: {
      name: backendJob.recruiter_id?.company_name || backendJob.company_name,
      size: backendJob.recruiter_id?.company_size,
      industry: backendJob.recruiter_id?.industry,
      founded: backendJob.recruiter_id?.founded_year,
      website: backendJob.recruiter_id?.website,
      description: backendJob.recruiter_id?.company_description,
      locations: backendJob.recruiter_id?.company_locations?.map(loc => loc.city) || [],
      benefits: backendJob.recruiter_id?.benefits || []
    },
    workingConditions: {
      workingHours: backendJob.working_conditions?.working_hours || '8:00 - 17:30 (Thứ 2 - Thứ 6)',
      workingModel: mapWorkLocationToFrontend(backendJob.working_conditions?.working_model || backendJob.work_location),
      probationPeriod: backendJob.working_conditions?.probation_period || '2 tháng',
      startDate: backendJob.working_conditions?.start_date || 'Thỏa thuận'
    },
    skillsRequired: backendJob.skills_required || [],
    educationRequired: backendJob.education_required,
    experienceRequired: backendJob.experience_required,
    highlights: backendJob.job_highlights || [],
    status: backendJob.status,
    isActive: backendJob.is_active
  };
};

/**
 * Convert frontend Job data to backend format
 * @param {Object} frontendJob - Job data from frontend
 * @returns {Object} Backend-formatted job data
 */
export const mapJobToBackend = (frontendJob) => {
  if (!frontendJob) return null;

  return {
    title: frontendJob.title,
    description: frontendJob.description,
    requirements: Array.isArray(frontendJob.requirements) ? frontendJob.requirements : [frontendJob.requirements],
    benefits: Array.isArray(frontendJob.benefits) ? frontendJob.benefits : [frontendJob.benefits],
    salary_min: frontendJob.salaryMin,
    salary_max: frontendJob.salaryMax,
    salary_currency: frontendJob.salaryCurrency || 'VND',
    job_type: mapJobTypeToBackend(frontendJob.jobType),
    work_location: mapWorkLocationToBackend(frontendJob.workLocation),
    seniority_level: mapExperienceToBackend(frontendJob.experience),
    location: {
      city: frontendJob.location,
      country: 'Vietnam'
    },
    application_deadline: frontendJob.deadline,
    is_hot: frontendJob.isHot || false,
    is_urgent: frontendJob.isUrgent || false,
    is_featured: frontendJob.isFeatured || false,
    tags: frontendJob.tags || [],
    nice_to_have_skills: frontendJob.niceToHave?.map(skill => ({ skill_name: skill })) || [],
    working_conditions: {
      working_hours: frontendJob.workingConditions?.workingHours,
      working_model: mapWorkLocationToBackend(frontendJob.workingConditions?.workingModel),
      probation_period: frontendJob.workingConditions?.probationPeriod,
      start_date: frontendJob.workingConditions?.startDate
    },
    job_highlights: frontendJob.highlights || [],
    positions_available: frontendJob.positionsAvailable || 1,
    skills_required: frontendJob.skillsRequired || [],
    education_required: frontendJob.educationRequired
  };
};

/**
 * Job Type Mappings
 */
const JOB_TYPE_MAPPING = {
  // Frontend to Backend
  'Full-time': 'full_time',
  'Part-time': 'part_time',
  'Contract': 'contract',
  'Internship': 'internship',
  'Freelance': 'freelance',
  // Backend to Frontend
  'full_time': 'Full-time',
  'part_time': 'Part-time',
  'contract': 'Contract',
  'internship': 'Internship',
  'freelance': 'Freelance'
};

export const mapJobTypeToFrontend = (backendType) => {
  return JOB_TYPE_MAPPING[backendType] || backendType;
};

export const mapJobTypeToBackend = (frontendType) => {
  return JOB_TYPE_MAPPING[frontendType] || frontendType;
};

/**
 * Experience Level Mappings
 */
const EXPERIENCE_MAPPING = {
  // Frontend to Backend
  'Fresher': 'entry',
  'Entry': 'entry',
  'Junior': 'junior',
  'Mid-level': 'mid',
  'Senior': 'senior',
  'Lead': 'lead',
  'Manager': 'executive',
  // Backend to Frontend
  'entry': 'Entry',
  'junior': 'Junior',
  'mid': 'Mid-level',
  'senior': 'Senior',
  'lead': 'Lead',
  'executive': 'Manager'
};

export const mapExperienceToFrontend = (backendLevel) => {
  return EXPERIENCE_MAPPING[backendLevel] || backendLevel;
};

export const mapExperienceToBackend = (frontendLevel) => {
  return EXPERIENCE_MAPPING[frontendLevel] || frontendLevel;
};

/**
 * Work Location Mappings
 */
const WORK_LOCATION_MAPPING = {
  // Frontend to Backend
  'Onsite': 'onsite',
  'Remote': 'remote',
  'Hybrid': 'hybrid',
  // Backend to Frontend
  'onsite': 'Onsite',
  'remote': 'Remote',
  'hybrid': 'Hybrid'
};

export const mapWorkLocationToFrontend = (backendLocation) => {
  return WORK_LOCATION_MAPPING[backendLocation] || backendLocation;
};

export const mapWorkLocationToBackend = (frontendLocation) => {
  return WORK_LOCATION_MAPPING[frontendLocation] || frontendLocation;
};

/**
 * Format salary for display
 * @param {number} min - Minimum salary
 * @param {number} max - Maximum salary
 * @param {string} currency - Currency code
 * @returns {string} Formatted salary string
 */
export const formatSalary = (min, max, currency = 'VND') => {
  if (!min && !max) return 'Thỏa thuận';
  
  if (currency === 'VND') {
    const minFormatted = min ? `${(min / 1000000).toFixed(0)}` : '';
    const maxFormatted = max ? `${(max / 1000000).toFixed(0)}` : '';
    
    if (min && max) {
      return `${minFormatted} - ${maxFormatted} triệu VND`;
    } else if (min) {
      return `Từ ${minFormatted} triệu VND`;
    } else {
      return `Lên đến ${maxFormatted} triệu VND`;
    }
  }
  
  // For USD and other currencies
  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  } else if (min) {
    return `From $${min.toLocaleString()}`;
  } else {
    return `Up to $${max.toLocaleString()}`;
  }
};

/**
 * Format date for display
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Calculate days ago from date
 * @param {string|Date} dateString - Date to calculate from
 * @returns {number} Number of days ago
 */
export const getDaysAgo = (dateString) => {
  if (!dateString) return 0;
  
  const today = new Date();
  const posted = new Date(dateString);
  const diffTime = Math.abs(today - posted);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Create search query for backend API
 * @param {Object} filters - Frontend filter object
 * @returns {Object} Backend query parameters
 */
export const createSearchQuery = (filters) => {
  const query = {};
  
  if (filters.searchTerm) {
    query.search = filters.searchTerm;
  }
  
  if (filters.category && filters.category !== 'all') {
    query.category = filters.category;
  }
  
  if (filters.location && filters.location !== 'all') {
    query.location = filters.location;
  }
  
  if (filters.jobType && filters.jobType !== 'all') {
    query.job_type = mapJobTypeToBackend(filters.jobType);
  }
  
  if (filters.experience && filters.experience !== 'all') {
    query.seniority_level = mapExperienceToBackend(filters.experience);
  }
  
  if (filters.salaryRange && filters.salaryRange !== 'all') {
    const [min, max] = filters.salaryRange.split('-').map(Number);
    if (filters.salaryRange === '60+') {
      query.salary_min = 60000000;
    } else if (min && max) {
      query.salary_min = min * 1000000;
      query.salary_max = max * 1000000;
    }
  }
  
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'newest':
        query.sort = '-created_at';
        break;
      case 'salary-high':
        query.sort = '-salary_max';
        break;
      case 'salary-low':
        query.sort = 'salary_min';
        break;
      case 'popular':
        query.sort = '-views_count';
        break;
    }
  }
  
  return query;
};

/**
 * Validate job data before sending to backend
 * @param {Object} jobData - Job data to validate
 * @returns {Object} Validation result
 */
export const validateJobData = (jobData) => {
  const errors = [];
  
  if (!jobData.title?.trim()) {
    errors.push('Tiêu đề công việc là bắt buộc');
  }
  
  if (!jobData.description?.trim()) {
    errors.push('Mô tả công việc là bắt buộc');
  }
  
  if (!jobData.requirements || jobData.requirements.length === 0) {
    errors.push('Yêu cầu công việc là bắt buộc');
  }
  
  if (!jobData.location?.trim()) {
    errors.push('Địa điểm làm việc là bắt buộc');
  }
  
  if (jobData.salaryMin && jobData.salaryMax && jobData.salaryMin > jobData.salaryMax) {
    errors.push('Lương tối thiểu không được lớn hơn lương tối đa');
  }
  
  if (!jobData.deadline) {
    errors.push('Hạn ứng tuyển là bắt buộc');
  } else {
    const deadline = new Date(jobData.deadline);
    const today = new Date();
    if (deadline <= today) {
      errors.push('Hạn ứng tuyển phải sau ngày hiện tại');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};