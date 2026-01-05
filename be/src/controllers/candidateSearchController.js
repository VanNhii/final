const Candidate = require('../models/Candidate');
const User = require('../models/User');
const { getPaginationParams, buildPaginationResponse, applyPagination, getSearchParams } = require('../utils/pagination');
const { incrementCVDownload } = require('../middleware/subscription');

// @desc    Search candidates (Premium feature)
// @route   GET /api/recruiters/candidates/search
// @access  Private/Recruiter with Premium
exports.searchCandidates = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const searchFilters = getSearchParams(req);
    const { skills, experience_level, education_level, location } = req.query;
    
    let query = { ...searchFilters };
    
    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query['skills_detailed.skill_name'] = { $in: skillsArray.map(s => new RegExp(s, 'i')) };
    }
    
    // Experience level filter
    if (experience_level) {
      query.experience_level = experience_level;
    }
    
    // Education level filter
    if (education_level) {
      query['education.degree_level'] = education_level;
    }
    
    // Location filter
    if (location) {
      query['contact_info.address'] = { $regex: location, $options: 'i' };
    }
    
    const candidatesQuery = Candidate.find(query)
      .populate('user_id', 'first_name last_name email phone avatar_url')
      .select('-cv_file_url') // Don't expose CV URLs in search
      .sort('-updated_at');
    
    const candidates = await applyPagination(candidatesQuery, page, limit, skip);
    const total = await Candidate.countDocuments(query);
    
    res.status(200).json(buildPaginationResponse(candidates, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidate profile (Premium feature)
// @route   GET /api/recruiters/candidates/:id
// @access  Private/Recruiter with Premium
exports.getCandidateProfile = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('user_id', 'first_name last_name email phone avatar_url');
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download candidate CV (Premium feature with limits)
// @route   GET /api/recruiters/candidates/:id/cv
// @access  Private/Recruiter with CV download feature
exports.downloadCandidateCV = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }
    
    if (!candidate.cv_file_url) {
      return res.status(404).json({
        success: false,
        message: 'CV not available for this candidate'
      });
    }
    
    // Increment CV download counter
    if (req.subscription && req.recruiter) {
      await incrementCVDownload(req.recruiter._id, req.subscription._id);
    }
    
    res.status(200).json({
      success: true,
      data: {
        cv_url: candidate.cv_file_url,
        candidate_name: candidate.full_name,
        downloaded_at: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

 