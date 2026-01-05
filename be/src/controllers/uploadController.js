const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const FileUpload = require('../models/FileUpload');

// @desc    Upload file
// @route   POST /api/v1/upload
// @access  Private
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { 
      upload_purpose = 'cv', 
      is_temporary = false,
      is_public = false,
      related_entity_type = null,
      related_entity_id = null,
      expires_in_days = null
    } = req.body;

    // Calculate expiration date for temporary files
    let expires_at = null;
    if (is_temporary && expires_in_days) {
      expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + parseInt(expires_in_days));
    }

    // Generate file checksum
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Determine file type based on mimetype
    let file_type = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      file_type = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      file_type = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      file_type = 'audio';
    } else if (req.file.mimetype.includes('zip') || req.file.mimetype.includes('rar')) {
      file_type = 'archive';
    }

    // Create file record in database
    const fileUpload = await FileUpload.create({
      user_id: req.user.id,
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      file_type: file_type,
      mime_type: req.file.mimetype,
      file_extension: path.extname(req.file.originalname).toLowerCase(),
      upload_purpose: upload_purpose,
      is_temporary: is_temporary,
      is_public: is_public,
      related_entity_type: related_entity_type,
      related_entity_id: related_entity_id,
      expires_at: expires_at,
      checksum: checksum,
      storage_provider: 'local'
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: fileUpload._id,
        original_name: fileUpload.original_name,
        file_name: fileUpload.file_name,
        file_url: `/uploads/${upload_purpose}/${req.file.filename}`,
        file_size: fileUpload.file_size,
        mime_type: fileUpload.mime_type,
        file_type: fileUpload.file_type,
        upload_purpose: fileUpload.upload_purpose,
        is_temporary: fileUpload.is_temporary,
        expires_at: fileUpload.expires_at,
        created_at: fileUpload.created_at
      }
    });
  } catch (error) {
    // Delete uploaded file if database operation fails
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    console.error('Upload controller error:', error);
    
    // Always return JSON response
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lưu file. Vui lòng thử lại.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's uploaded files
// @route   GET /api/v1/upload
// @access  Private
const getUserFiles = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      file_type,
      upload_purpose,
      is_temporary 
    } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user_id: req.user.id };
    if (file_type) {
      query.file_type = file_type;
    }
    if (upload_purpose) {
      query.upload_purpose = upload_purpose;
    }
    if (is_temporary !== undefined) {
      query.is_temporary = is_temporary === 'true';
    }

    const files = await FileUpload.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-file_path -user_id -checksum');

    const total = await FileUpload.countDocuments(query);

    // Add full URL to files
    const filesWithUrl = files.map(file => {
      const subDir = file.upload_purpose || 'general';
      return {
        ...file.toObject(),
        file_url: `/uploads/${subDir}/${file.file_name}`
      };
    });

    res.status(200).json({
      success: true,
      count: files.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      data: filesWithUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get file details
// @route   GET /api/v1/upload/:id
// @access  Private
const getFile = async (req, res, next) => {
  try {
    const file = await FileUpload.findOne({
      _id: req.params.id,
      user_id: req.user.id
    }).select('-file_path -user_id -checksum');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...file.toObject(),
        file_url: `/uploads/${file.upload_purpose || 'general'}/${file.file_name}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/v1/upload/:id
// @access  Private
const deleteFile = async (req, res, next) => {
  try {
    const file = await FileUpload.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete physical file
    if (file.file_path && fs.existsSync(file.file_path)) {
      try {
        fs.unlinkSync(file.file_path);
      } catch (unlinkError) {
        console.error('Error deleting physical file:', unlinkError);
      }
    }

    // Delete database record
    await FileUpload.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download file
// @route   GET /api/v1/upload/:id/download
// @access  Private
const downloadFile = async (req, res, next) => {
  try {
    const file = await FileUpload.findOne({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if physical file exists
    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'Physical file not found'
      });
    }

    // Increment download count
    await FileUpload.findByIdAndUpdate(req.params.id, {
      $inc: { download_count: 1 }
    });

    // Encode filename properly for Content-Disposition header
    // Handle Vietnamese and special characters
    const encodedFilename = encodeURIComponent(file.original_name);
    const safeFilename = file.original_name.replace(/[^\w\s.-]/g, '_');

    // Set appropriate headers for download
    // Use RFC 6266 format for international filenames
    res.setHeader('Content-Disposition', 
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    
    // Send file
    res.sendFile(path.resolve(file.file_path));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getUserFiles,
  getFile,
  deleteFile,
  downloadFile
};
