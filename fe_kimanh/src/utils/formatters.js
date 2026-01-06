// Utility functions for formatting data

/**
 * Format location object to string
 * @param {Object|string} location - Location object or string
 * @returns {string} Formatted location string
 */
export const formatLocation = (location) => {
  if (!location) return 'Chưa cập nhật';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    const parts = [];
    if (location.address) parts.push(location.address);
    if (location.city) parts.push(location.city);
    if (location.country && location.country !== 'Vietnam') parts.push(location.country);
    return parts.length > 0 ? parts.join(', ') : 'Chưa cập nhật';
  }
  return 'Chưa cập nhật';
};

/**
 * Format salary range
 * @param {number} min - Minimum salary
 * @param {number} max - Maximum salary
 * @param {string} currency - Currency code
 * @returns {string} Formatted salary string
 */
export const formatSalary = (min, max, currency = 'VND') => {
  if (!min && !max) return 'Thỏa thuận';
  
  const formatNumber = (num) => {
    if (currency === 'VND') {
      return (num / 1000000).toFixed(0) + 'M';
    }
    return num.toLocaleString();
  };
  
  if (min && max) {
    return `${formatNumber(min)} - ${formatNumber(max)} ${currency}`;
  } else if (min) {
    return `Từ ${formatNumber(min)} ${currency}`;
  } else if (max) {
    return `Tối đa ${formatNumber(max)} ${currency}`;
  }
  
  return 'Thỏa thuận';
};

/**
 * Format job type to display text
 * @param {string} jobType - Job type code
 * @returns {string} Display text
 */
export const formatJobType = (jobType) => {
  const jobTypes = {
    'full_time': 'Toàn thời gian',
    'part_time': 'Bán thời gian', 
    'contract': 'Hợp đồng',
    'internship': 'Thực tập',
    'freelance': 'Freelance'
  };
  
  return jobTypes[jobType] || jobType;
};

/**
 * Format work location to display text
 * @param {string} workLocation - Work location code
 * @returns {string} Display text
 */
export const formatWorkLocation = (workLocation) => {
  const workLocations = {
    'onsite': 'Tại văn phòng',
    'remote': 'Làm việc từ xa',
    'hybrid': 'Lai (Hybrid)'
  };
  
  return workLocations[workLocation] || workLocation;
};

/**
 * Format education level to display text
 * @param {string} education - Education level code
 * @returns {string} Display text
 */
export const formatEducation = (education) => {
  const educationLevels = {
    'high_school': 'THPT',
    'associate': 'Cao đẳng',
    'bachelor': 'Đại học',
    'master': 'Thạc sĩ',
    'doctorate': 'Tiến sĩ',
    'not_required': 'Không yêu cầu'
  };
  
  return educationLevels[education] || education;
};

/**
 * Format experience range
 * @param {Object} experience - Experience object with min and max
 * @returns {string} Formatted experience string
 */
export const formatExperience = (experience) => {
  if (!experience) return 'Không yêu cầu';
  
  const { min, max } = experience;
  
  if (min && max) {
    if (min === max) {
      return `${min} năm`;
    }
    return `${min} - ${max} năm`;
  } else if (min) {
    return `Tối thiểu ${min} năm`;
  } else if (max) {
    return `Tối đa ${max} năm`;
  }
  
  return 'Không yêu cầu';
};

/**
 * Format date to Vietnamese format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format datetime to Vietnamese format
 * @param {Date|string} datetime - Datetime to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (datetime) => {
  if (!datetime) return '';
  
  const d = new Date(datetime);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount, currency = 'VND') => {
  if (typeof amount !== 'number') return '';

  const formatNumber = (num) => {
    if (currency === 'VND') {
      // Check if the amount is already in a reasonable range (less than 100M)
      // If so, format it directly without dividing
      if (num < 100) {
        return num.toLocaleString('vi-VN');
      }
      // Otherwise format in millions for larger numbers
      return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    return num.toLocaleString();
  };

  return `${formatNumber(amount)} ${currency}`;
};