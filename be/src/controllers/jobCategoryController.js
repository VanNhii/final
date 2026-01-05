const JobCategory = require('../models/JobCategory');
const Job = require('../models/Job');
const { getPaginationParams, buildPaginationResponse, applyPagination, getSearchParams } = require('../utils/pagination');

// @desc    Get all job categories
// @route   GET /api/v1/job-categories
// @access  Public
exports.getJobCategories = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    const { parent_only, include_subcategories, is_active } = req.query;
    
    let query = { ...searchFilters };
    
    // Filter by active status
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    } else {
      query.is_active = true; // Default to active only
    }
    
    // Filter parent categories only
    if (parent_only === 'true') {
      query.parent_category_id = null;
    }
    
    // Simple list without pagination (for dropdowns, etc.)
    if (req.query.simple === 'true') {
      const categories = await JobCategory.find(query)
        .select('category_name _id parent_category_id')
        .sort('sort_order category_name');
      
      return res.status(200).json({
        success: true,
        count: categories.length,
        data: categories
      });
    }
    
    // Full list with pagination
    let categoriesQuery = JobCategory.find(query);
    
    // Include subcategories if requested
    if (include_subcategories === 'true') {
      categoriesQuery = categoriesQuery.populate('subcategories');
    }
    
    // Include job count
    categoriesQuery = categoriesQuery.populate('jobs_count');
    
    const categories = await applyPagination(categoriesQuery, page, limit, skip);
    const total = await JobCategory.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(categories, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job category
// @route   GET /api/v1/job-categories/:id
// @access  Public
exports.getJobCategory = async (req, res, next) => {
  try {
    const category = await JobCategory.findById(req.params.id)
      .populate('subcategories jobs_count');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Job category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create job category
// @route   POST /api/v1/job-categories
// @access  Private/Admin
exports.createJobCategory = async (req, res, next) => {
  try {
    const category = await JobCategory.create(req.body);
    
    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job category
// @route   PUT /api/v1/job-categories/:id
// @access  Private/Admin
exports.updateJobCategory = async (req, res, next) => {
  try {
    const category = await JobCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Job category not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job category
// @route   DELETE /api/v1/job-categories/:id
// @access  Private/Admin
exports.deleteJobCategory = async (req, res, next) => {
  try {
    const category = await JobCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Job category not found'
      });
    }
    
    // Check if category has subcategories
    const subcategories = await JobCategory.find({ parent_category_id: category._id });
    if (subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories. Please delete subcategories first.'
      });
    }
    
    // Check if category has associated jobs
    const jobsCount = await Job.countDocuments({ category_id: category._id });
    if (jobsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category with ${jobsCount} associated jobs. Please reassign jobs first.`
      });
    }
    
    await category.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Job category deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get job categories for admin (with pagination and filters)
// @route   GET /api/admin/job-categories
// @access  Private/Admin
exports.getJobCategoriesForAdmin = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    const { is_active, parent_only } = req.query;
    
    let query = { ...searchFilters };
    
    // Filter by active status
    if (is_active !== undefined) {
      query.is_active = is_active === 'true';
    }
    
    // Filter parent categories only
    if (parent_only === 'true') {
      query.parent_category_id = null;
    }
    
    const categoriesQuery = JobCategory.find(query)
      .populate('subcategories')
      .populate('jobs_count')
      .populate('parent_category_id', 'category_name');
    
    const categories = await applyPagination(categoriesQuery, page, limit, skip);
    const total = await JobCategory.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(categories, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle job category status
// @route   PUT /api/admin/job-categories/:id/toggle-status
// @access  Private/Admin
exports.toggleJobCategoryStatus = async (req, res, next) => {
  try {
    const category = await JobCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Job category not found'
      });
    }
    
    category.is_active = !category.is_active;
    await category.save();
    
    res.status(200).json({
      success: true,
      message: `Job category ${category.is_active ? 'activated' : 'deactivated'} successfully`,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder job categories
// @route   PUT /api/admin/job-categories/reorder
// @access  Private/Admin
exports.reorderJobCategories = async (req, res, next) => {
  try {
    const { categories } = req.body; // Array of { id, sort_order }
    
    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide categories array with id and sort_order'
      });
    }
    
    // Update sort order for each category
    const updatePromises = categories.map(({ id, sort_order }) =>
      JobCategory.findByIdAndUpdate(id, { sort_order }, { new: true })
    );
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      message: 'Job categories reordered successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category statistics
// @route   GET /api/admin/job-categories/stats
// @access  Private/Admin
exports.getCategoryStats = async (req, res, next) => {
  try {
    const Job = require('../models/Job');
    
    const totalCategories = await JobCategory.countDocuments();
    const activeCategories = await JobCategory.countDocuments({ is_active: true });
    const inactiveCategories = await JobCategory.countDocuments({ is_active: false });
    const parentCategories = await JobCategory.countDocuments({ parent_category_id: null });
    const subcategories = await JobCategory.countDocuments({ parent_category_id: { $ne: null } });
    
    // Total jobs count
    const totalJobs = await Job.countDocuments({ status: 'approved' });
    
    // Categories with job counts (using categories array field)
    const categoriesWithJobs = await JobCategory.aggregate([
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: 'categories',
          as: 'jobs'
        }
      },
      {
        $project: {
          category_name: 1,
          jobCount: { $size: '$jobs' }
        }
      },
      {
        $sort: { jobCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalJobs,
        overview: {
          totalCategories,
          activeCategories,
          inactiveCategories,
          parentCategories,
          subcategories
        },
        topCategoriesByJobs: categoriesWithJobs
      }
    });
  } catch (error) {
    next(error);
  }
};
