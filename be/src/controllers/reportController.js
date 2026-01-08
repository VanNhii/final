const Report = require('../models/Report');

// @desc    Get all reports
// @route   GET /api/v1/reports
// @access  Private/Admin
exports.getReports = async (req, res, next) => {
  try {
    let query = {};
    
    // Filter by status if provided
    if (req.query.status) {
      if (req.query.status === 'active') {
        query.status = { $in: ['pending', 'investigating'] };
      } else {
        query.status = req.query.status;
      }
    }
    
    // Filter by priority if provided
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    const reports = await Report.find(query)
      .sort('-created_at')
      .populate('reported_entity_id');
    
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's reports
// @route   GET /api/v1/reports/my-reports
// @access  Private
exports.getMyReports = async (req, res, next) => {
  try {
    const reports = await Report.find({ reporter_id: req.user.id })
      .sort('-created_at');
    
    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single report
// @route   GET /api/v1/reports/:id
// @access  Private/Admin
exports.getReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Make sure user is admin or report owner
    if (req.user.role !== 'admin' && report.reporter_id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this report'
      });
    }
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create report
// @route   POST /api/v1/reports
// @access  Private
exports.createReport = async (req, res, next) => {
  try {
    req.body.reporter_id = req.user.id;
    
    // Handle evidence files if present
    if (req.files && req.files.length > 0) {
      const evidenceFiles = req.files.map(file => {
        // Construct file URL
        const fileUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${file.filename.includes('/') || file.filename.includes('\\') ? file.filename : 'general/' + file.filename}`;
        
        // Fix URL path based on upload middleware logic
        // The upload middleware saves to subdirectories but filename doesn't include subdir
        // We need to determine subdir based on logic or check file path
        
        // Actually, upload middleware creates path: public/uploads/SUBDIR/filename
        // But req.file.path contains the full path on disk
        // req.file.destination contains the dir
        
        let fileType = 'other';
        if (file.mimetype.startsWith('image/')) fileType = 'image';
        else if (file.mimetype.includes('pdf') || file.mimetype.includes('document') || file.mimetype.includes('word')) fileType = 'document';
        
        // Construct relative path for URL
        // Get subdirectory from destination
        const relativePath = file.path.split('uploads')[1].replace(/\\/g, '/');
        
        // Fix filename encoding (Multer/Busboy latin1 issue)
        let originalName = file.originalname;
        try {
          originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        } catch (err) {
          console.error('Error decoding filename:', err);
        }

        return {
          file_name: originalName,
          file_url: `/uploads${relativePath}`,
          file_type: fileType
        };
      });
      
      req.body.evidence_files = evidenceFiles;
    }
    
    const report = await Report.create(req.body);
    
    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update report status
// @route   PUT /api/v1/reports/:id/status
// @access  Private/Admin
exports.updateReportStatus = async (req, res, next) => {
  try {
    const { status, admin_notes, resolution_action } = req.body;
    
    const updateData = {
      status,
      admin_notes
    };
    
    if (status === 'resolved') {
      updateData.resolved_at = new Date();
      updateData.resolved_by = req.user.id;
      if (resolution_action) {
        updateData.resolution_action = resolution_action;
      }
    }
    
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete report
// @route   DELETE /api/v1/reports/:id
// @access  Private/Admin
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    await report.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
