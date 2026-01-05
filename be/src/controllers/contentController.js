const Content = require('../models/Content');
const { getPaginationParams, buildPaginationResponse, applyPagination, getSearchParams } = require('../utils/pagination');

// @desc    Create new content
// @route   POST /api/content
// @access  Private (Admin, Editor)
exports.createContent = async (req, res, next) => {
  try {
    const {
      title,
      content,
      excerpt,
      featured_image_url,
      content_type,
      category,
      tags = [],
      status = 'draft',
      is_featured = false,
      is_urgent = false,
      is_pinned = false,
      source,
      related_companies = [],
      meta_title,
      meta_description,
      scheduled_publish_at,
      allow_comments = true,
      send_notification = false
    } = req.body;

    // Validate required fields
    if (!title || !content || !content_type || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, content, content_type, and category'
      });
    }

    const newContent = await Content.create({
      title,
      content,
      excerpt,
      featured_image_url,
      author_id: req.user.id,
      content_type,
      category,
      tags,
      status,
      is_featured,
      is_urgent,
      is_pinned,
      source,
      related_companies,
      meta_title,
      meta_description,
      scheduled_publish_at,
      allow_comments,
      send_notification
    });

    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: newContent
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Content with this slug already exists'
      });
    }
    next(error);
  }
};

// @desc    Get all content with filtering and pagination
// @route   GET /api/content
// @access  Public
exports.getAllContent = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const {
      content_type,
      category,
      status = 'published',
      tags,
      is_featured,
      is_urgent,
      is_pinned,
      author_id,
      search,
      sort = '-published_at'
    } = req.query;

    // Build filter object
    let filter = {};
    
    // Only show published content for non-admin users
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      filter.status = 'published';
    } else if (status) {
      filter.status = status;
    }

    if (content_type) filter.content_type = content_type;
    if (category) filter.category = category;
    if (author_id) filter.author_id = author_id;
    if (is_featured !== undefined) filter.is_featured = is_featured === 'true';
    if (is_urgent !== undefined) filter.is_urgent = is_urgent === 'true';
    if (is_pinned !== undefined) filter.is_pinned = is_pinned === 'true';
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Search functionality
    if (search) {
      filter.$text = { $search: search };
    }

    const contentQuery = Content.find(filter)
      .populate('author_id', 'full_name avatar_url')
      .sort(sort);

    const totalCount = await Content.countDocuments(filter);
    const content = await applyPagination(contentQuery, page, limit, skip);
    const paginationResponse = buildPaginationResponse(totalCount, page, limit);

    res.status(200).json({
      success: true,
      count: content.length,
      data: content,
      pagination: paginationResponse
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single content by ID or slug
// @route   GET /api/content/:identifier
// @access  Public
exports.getContentById = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by slug
    let content;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      content = await Content.findById(identifier).populate('author_id', 'full_name avatar_url');
    } else {
      content = await Content.findOne({ slug: identifier }).populate('author_id', 'full_name avatar_url');
    }

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check if user can view unpublished content
    if (content.status !== 'published' && 
        (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor' && req.user.id !== content.author_id.toString()))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Increment view count for published content
    if (content.status === 'published') {
      await Content.findByIdAndUpdate(content._id, { $inc: { views_count: 1 } });
      content.views_count += 1;
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update content
// @route   PUT /api/content/:id
// @access  Private (Admin, Editor, Author)
exports.updateContent = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor' && req.user.id !== content.author_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('author_id', 'full_name avatar_url');

    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: updatedContent
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Content with this slug already exists'
      });
    }
    next(error);
  }
};

// @desc    Delete content
// @route   DELETE /api/content/:id
// @access  Private (Admin, Editor, Author)
exports.deleteContent = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor' && req.user.id !== content.author_id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await Content.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish content
// @route   PUT /api/content/:id/publish
// @access  Private (Admin, Editor)
exports.publishContent = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'published',
        published_at: new Date()
      },
      { new: true }
    ).populate('author_id', 'full_name avatar_url');

    res.status(200).json({
      success: true,
      message: 'Content published successfully',
      data: updatedContent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive content
// @route   PUT /api/content/:id/archive
// @access  Private (Admin, Editor)
exports.archiveContent = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    ).populate('author_id', 'full_name avatar_url');

    res.status(200).json({
      success: true,
      message: 'Content archived successfully',
      data: updatedContent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle featured status
// @route   PUT /api/content/:id/featured
// @access  Private (Admin, Editor)
exports.toggleFeatured = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      { is_featured: !content.is_featured },
      { new: true }
    ).populate('author_id', 'full_name avatar_url');

    res.status(200).json({
      success: true,
      message: `Content ${updatedContent.is_featured ? 'featured' : 'unfeatured'} successfully`,
      data: updatedContent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle pinned status
// @route   PUT /api/content/:id/pinned
// @access  Private (Admin, Editor)
exports.togglePinned = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedContent = await Content.findByIdAndUpdate(
      req.params.id,
      { is_pinned: !content.is_pinned },
      { new: true }
    ).populate('author_id', 'full_name avatar_url');

    res.status(200).json({
      success: true,
      message: `Content ${updatedContent.is_pinned ? 'pinned' : 'unpinned'} successfully`,
      data: updatedContent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured content
// @route   GET /api/content/featured
// @access  Public
exports.getFeaturedContent = async (req, res, next) => {
  try {
    const { limit = 5, content_type } = req.query;
    
    let filter = {
      status: 'published',
      is_featured: true
    };

    if (content_type) {
      filter.content_type = content_type;
    }

    const featuredContent = await Content.find(filter)
      .populate('author_id', 'full_name avatar_url')
      .sort('-published_at')
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: featuredContent.length,
      data: featuredContent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pinned content
// @route   GET /api/content/pinned
// @access  Public
exports.getPinnedContent = async (req, res, next) => {
  try {
    const { limit = 5, content_type } = req.query;
    
    let filter = {
      status: 'published',
      is_pinned: true
    };

    if (content_type) {
      filter.content_type = content_type;
    }

    const pinnedContent = await Content.find(filter)
      .populate('author_id', 'full_name avatar_url')
      .sort('-published_at')
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: pinnedContent.length,
      data: pinnedContent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get content categories by type
// @route   GET /api/content/categories/:type
// @access  Public
exports.getCategoriesByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    const validCategories = {
      blog_post: ['career_tips', 'industry_insights', 'company_spotlight', 'tech_trends', 'interview_tips', 'salary_guide', 'skill_development'],
      news_article: ['job_market', 'salary_trends', 'company_news', 'hiring_trends', 'tech_industry', 'policy_updates', 'event_announcements'],
      announcement: ['system_update', 'feature_release', 'maintenance', 'policy_change', 'event']
    };

    if (!validCategories[type]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        content_type: type,
        categories: validCategories[type]
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get content analytics
// @route   GET /api/content/analytics
// @access  Private (Admin, Editor)
exports.getContentAnalytics = async (req, res, next) => {
  try {
    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const analytics = await Content.aggregate([
      {
        $group: {
          _id: null,
          totalContent: { $sum: 1 },
          publishedContent: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          draftContent: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          archivedContent: {
            $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
          },
          totalViews: { $sum: '$views_count' },
          averageViews: { $avg: '$views_count' },
          featuredContent: {
            $sum: { $cond: ['$is_featured', 1, 0] }
          },
          pinnedContent: {
            $sum: { $cond: ['$is_pinned', 1, 0] }
          }
        }
      }
    ]);

    // Get content by type
    const contentByType = await Content.aggregate([
      {
        $group: {
          _id: '$content_type',
          count: { $sum: 1 },
          totalViews: { $sum: '$views_count' }
        }
      }
    ]);

    // Get top performing content
    const topContent = await Content.find({ status: 'published' })
      .populate('author_id', 'full_name')
      .sort('-views_count')
      .limit(10)
      .select('title views_count published_at author_id');

    // Get recent content
    const recentContent = await Content.find()
      .populate('author_id', 'full_name')
      .sort('-created_at')
      .limit(10)
      .select('title status content_type created_at author_id');

    res.status(200).json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalContent: 0,
          publishedContent: 0,
          draftContent: 0,
          archivedContent: 0,
          totalViews: 0,
          averageViews: 0,
          featuredContent: 0,
          pinnedContent: 0
        },
        contentByType,
        topContent,
        recentContent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's content
// @route   GET /api/content/my-content
// @access  Private
exports.getMyContent = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const {
      status,
      content_type,
      sort = '-created_at'
    } = req.query;

    let filter = { author_id: req.user.id };
    
    if (status) filter.status = status;
    if (content_type) filter.content_type = content_type;

    const contentQuery = Content.find(filter).sort(sort);
    const totalCount = await Content.countDocuments(filter);
    const content = await applyPagination(contentQuery, page, limit, skip);
    const paginationResponse = buildPaginationResponse(totalCount, page, limit);

    res.status(200).json({
      success: true,
      count: content.length,
      data: content,
      pagination: paginationResponse
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update content status
// @route   PUT /api/content/bulk-update
// @access  Private (Admin, Editor)
exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const { contentIds, status } = req.body;

    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid content IDs'
      });
    }

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const updateData = { status };
    if (status === 'published') {
      updateData.published_at = new Date();
    }

    const result = await Content.updateMany(
      { _id: { $in: contentIds } },
      updateData
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} content items updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};