const mongoose = require('mongoose');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const Recruiter = require('../models/Recruiter');
const Job = require('../models/Job');
const Application = require('../models/Application');
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

    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    if (!recruiter) {
      return res.status(404).json({ success: false, message: 'Recruiter profile not found' });
    }

    // Get all jobs by this recruiter to find their applicants
    const jobs = await Job.find({ recruiter_id: recruiter._id }).select('_id');
    const jobIds = jobs.map(j => j._id);

    // Get all candidate IDs who have applied to these jobs
    const applications = await Application.find({ job_id: { $in: jobIds } }).select('candidate_id');
    const applicantIds = [...new Set(applications.map(a => a.candidate_id.toString()))];

    let query = { ...searchFilters, _id: { $in: applicantIds } };
    
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
    
    const candidatesRaw = await applyPagination(candidatesQuery, page, limit, skip);
    const total = await Candidate.countDocuments(query);
    
    // Map candidates to structure expected by frontend
    const candidates = candidatesRaw.map(c => ({
      _id: c._id,
      fullName: c.user_id ? `${c.user_id.first_name || ''} ${c.user_id.last_name || ''}`.trim() : 'Ẩn danh',
      avatar: c.user_id?.avatar_url,
      email: c.user_id?.email,
      phone: c.user_id?.phone,
      experience: c.experience_years || 0,
      skills: c.skills_detailed?.map(s => s.skill_name) || [],
      expectedSalary: c.salary_expectation?.min || 0,
      location: c.city || c.address || 'Chưa cập nhật',
      education: c.education_level
    }));

    // Calculate basic stats for this recruiter's applicant pool
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    let stats = {
      newThisWeek: 0,
      averageExperience: 0,
      topSkills: []
    };

    if (applicantIds.length > 0) {
      const [newThisWeekCount, avgExpResult] = await Promise.all([
        Candidate.countDocuments({ 
          _id: { $in: applicantIds },
          created_at: { $gte: oneWeekAgo } 
        }),
        Candidate.aggregate([
          { $match: { _id: { $in: applicantIds.map(id => new mongoose.Types.ObjectId(id)) } } },
          { $group: { _id: null, avgExp: { $avg: '$experience_years' } } }
        ])
      ]);

      stats.newThisWeek = newThisWeekCount || 0;
      stats.averageExperience = Math.round((avgExpResult[0]?.avgExp || 0) * 10) / 10;
    }
    
    res.status(200).json({
      success: true,
      data: {
        candidates,
        total,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get candidate profile (Premium feature)
// @route   GET /api/recruiters/candidates/:id
// @access  Private/Recruiter with Premium
exports.getCandidateProfile = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    if (!recruiter) {
      return res.status(404).json({ success: false, message: 'Recruiter profile not found' });
    }

    // Check if this candidate has applied to any of the recruiter's jobs
    const jobs = await Job.find({ recruiter_id: recruiter._id }).select('_id');
    const jobIds = jobs.map(j => j._id);
    const hasApplied = await Application.exists({ 
      candidate_id: req.params.id, 
      job_id: { $in: jobIds } 
    });

    if (!hasApplied) {
      return res.status(403).json({
        success: false,
        message: 'You can only view candidates who have applied to your jobs.'
      });
    }

    const candidate = await Candidate.findById(req.params.id)
      .populate('user_id', 'first_name last_name email phone avatar_url');
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }
    
    // Map to structure expected by frontend modal
    const mappedCandidate = {
      _id: candidate._id,
      fullName: candidate.user_id ? `${candidate.user_id.first_name || ''} ${candidate.user_id.last_name || ''}`.trim() : 'Ẩn danh',
      avatar: candidate.user_id?.avatar_url,
      email: candidate.user_id?.email,
      phone: candidate.user_id?.phone,
      experience: candidate.experience_years || 0,
      location: candidate.city || candidate.address || 'Chưa cập nhật',
      expectedSalary: candidate.salary_expectation?.min || 0,
      education: candidate.education_level,
      skills: candidate.skills_detailed?.map(s => s.skill_name) || [],
      summary: candidate.bio,
      workExperience: candidate.experience?.map(exp => ({
        position: exp.position,
        company: exp.company_name,
        duration: `${exp.start_date ? new Date(exp.start_date).getFullYear() : ''} - ${exp.is_current ? 'Hiện tại' : (exp.end_date ? new Date(exp.end_date).getFullYear() : '')}`,
        description: exp.description
      })) || []
    };
    
    res.status(200).json({
      success: true,
      data: mappedCandidate
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
    const recruiter = await Recruiter.findOne({ user_id: req.user.id });
    if (!recruiter) {
      return res.status(404).json({ success: false, message: 'Recruiter profile not found' });
    }

    // Check if this candidate has applied to any of the recruiter's jobs
    const jobs = await Job.find({ recruiter_id: recruiter._id }).select('_id');
    const jobIds = jobs.map(j => j._id);
    const hasApplied = await Application.exists({ 
      candidate_id: req.params.id, 
      job_id: { $in: jobIds } 
    });

    if (!hasApplied) {
      return res.status(403).json({
        success: false,
        message: 'You can only download CVs of candidates who have applied to your jobs.'
      });
    }

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

 