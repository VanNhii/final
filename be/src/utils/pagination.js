// Pagination utility functions
const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10)); // Max 100 items per page
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    count: data.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    },
    data
  };
};

// Apply pagination to mongoose query
const applyPagination = (query, page, limit, skip) => {
  return query
    .limit(limit)
    .skip(skip)
    .sort('-created_at'); // Default sort by newest first
};

// Get search and filter parameters
const getSearchParams = (req) => {
  const { search, status, role, category, location, salary_min, salary_max } = req.query;
  const filters = {};
  
  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { full_name: { $regex: search, $options: 'i' } },
      { company_name: { $regex: search, $options: 'i' } },
      {seniority_level: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status) filters.status = status;
  if (role) filters.role = role;
  if (category) filters.category_id = category;
  if (location) filters['location.city'] = { $regex: location, $options: 'i' };
  if (salary_min) filters.salary_min = { $gte: parseInt(salary_min) };
  if (salary_max) filters.salary_max = { $lte: parseInt(salary_max) };
  
  return filters;
};

// Date range filter
const getDateRangeFilter = (req) => {
  const { start_date, end_date } = req.query;
  const dateFilter = {};
  
  if (start_date || end_date) {
    dateFilter.created_at = {};
    if (start_date) dateFilter.created_at.$gte = new Date(start_date);
    if (end_date) dateFilter.created_at.$lte = new Date(end_date);
  }
  
  return dateFilter;
};

module.exports = {
  getPaginationParams,
  buildPaginationResponse,
  applyPagination,
  getSearchParams,
  getDateRangeFilter
};
