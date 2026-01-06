const FavoriteJob = require('../models/FavoriteJob');
const Job = require('../models/Job');
const { getPaginationParams, buildPaginationResponse, applyPagination } = require('../utils/pagination');

// @desc    Add job to favorites
// @route   POST /api/v1/favorite-jobs
// @access  Private
exports.addFavoriteJob = async (req, res, next) => {
  try {
    const { job_id, notes } = req.body;
    
    // Check if job exists
    const job = await Job.findById(job_id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Check if already favorited
    const existingFavorite = await FavoriteJob.findOne({
      user_id: req.user.id,
      job_id: job_id
    });
    
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Job already in favorites'
      });
    }
    
    const favorite = await FavoriteJob.create({
      user_id: req.user.id,
      job_id,
      notes
    });
    
    await favorite.populate('job_id', 'title company_name location salary_range');
    
    res.status(201).json({
      success: true,
      data: favorite
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's favorite jobs
// @route   GET /api/v1/favorite-jobs
// @access  Private
exports.getFavoriteJobs = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    
    const favoritesQuery = FavoriteJob.find({ user_id: req.user.id })
      .populate({
        path: 'job_id',
        select: 'title company_name location salary_range employment_type is_active',
        populate: {
          path: 'recruiter_id',
          select: 'company_name logo_url'
        }
      })
      .sort('-saved_at');
    
    const favorites = await applyPagination(favoritesQuery, page, limit, skip);
    const total = await FavoriteJob.countDocuments({ user_id: req.user.id });
    
    res.status(200).json(buildPaginationResponse(favorites, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Update favorite job notes
// @route   PUT /api/v1/favorite-jobs/:id
// @access  Private
exports.updateFavoriteJob = async (req, res, next) => {
  try {
    const { notes } = req.body;
    
    let favorite = await FavoriteJob.findById(req.params.id);
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite job not found'
      });
    }
    
    // Check ownership
    if (favorite.user_id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this favorite'
      });
    }
    
    favorite.notes = notes;
    await favorite.save();
    
    await favorite.populate('job_id', 'title company_name location salary_range');
    
    res.status(200).json({
      success: true,
      data: favorite
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove job from favorites
// @route   DELETE /api/v1/favorite-jobs/:id
// @access  Private
exports.removeFavoriteJob = async (req, res, next) => {
  try {
    const favorite = await FavoriteJob.findById(req.params.id);
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite job not found'
      });
    }
    
    // Check ownership
    if (favorite.user_id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to remove this favorite'
      });
    }
    
    await favorite.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove job from favorites by job ID
// @route   DELETE /api/v1/favorite-jobs/job/:jobId
// @access  Private
exports.removeFavoriteByJobId = async (req, res, next) => {
  try {
    const favorite = await FavoriteJob.findOne({
      user_id: req.user.id,
      job_id: req.params.jobId
    });
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Job not in favorites'
      });
    }
    
    await favorite.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Job removed from favorites'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if job is favorited
// @route   GET /api/v1/favorite-jobs/check/:jobId
// @access  Private
exports.checkFavoriteStatus = async (req, res, next) => {
  try {
    const favorite = await FavoriteJob.findOne({
      user_id: req.user.id,
      job_id: req.params.jobId
    });
    
    res.status(200).json({
      success: true,
      data: {
        isFavorited: !!favorite,
        favoriteId: favorite?._id || null
      }
    });
  } catch (error) {
    next(error);
  }
};