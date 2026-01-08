const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const FileUpload = require('../models/FileUpload');
const cloudinary = require('../config/cloudinary');

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;
};

// @desc    Upload file (supports both local and Cloudinary)
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

    let file_url, file_path, storage_provider, cloudinary_public_id;

    // Check if Cloudinary upload (has path property from cloudinary storage)
    if (req.file.path && req.file.path.startsWith('http')) {
      // Cloudinary upload
      file_url = req.file.path;
      file_path = req.file.path;
      storage_provider = 'cloudinary';
      cloudinary_public_id = req.file.filename; // Cloudinary public_id

      console.log('✅ File uploaded to Cloudinary:', file_url);
    } else {
      // Local upload - use web-accessible path
      file_url = `/uploads/${upload_purpose}/${req.file.filename}`;
      file_path = file_url;
      storage_provider = 'local';

      console.log('✅ File uploaded locally:', file_path);
    }

    // Generate checksum for local files
    let checksum = null;
    if (storage_provider === 'local' && req.file.path) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
      } catch (e) {
        console.warn('Could not generate checksum:', e.message);
      }
    }

    // Create file record in database
    const fileUpload = await FileUpload.create({
      user_id: req.user.id,
      file_name: req.file.filename || path.basename(file_url),
      original_name: req.file.originalname,
      file_path: file_path,
      file_url: file_url,
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
      storage_provider: storage_provider,
      cloudinary_public_id: cloudinary_public_id || null
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: fileUpload._id,
        original_name: fileUpload.original_name,
        file_name: fileUpload.file_name,
        file_url: file_url,
        file_size: fileUpload.file_size,
        mime_type: fileUpload.mime_type,
        file_type: fileUpload.file_type,
        upload_purpose: fileUpload.upload_purpose,
        is_temporary: fileUpload.is_temporary,
        expires_at: fileUpload.expires_at,
        storage_provider: storage_provider,
        created_at: fileUpload.created_at
      }
    });
  } catch (error) {
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
      .select('-user_id -checksum');

    const total = await FileUpload.countDocuments(query);

    // Add full URL to files
    const filesWithUrl = files.map(file => {
      return {
        ...file.toObject(),
        file_url: file.file_url || file.file_path
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
    }).select('-user_id -checksum');

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
        file_url: file.file_url || file.file_path
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

    // Delete from storage
    if (file.storage_provider === 'cloudinary' && file.cloudinary_public_id) {
      // Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(file.cloudinary_public_id);
        console.log('✅ Deleted from Cloudinary:', file.cloudinary_public_id);
      } catch (cloudError) {
        console.error('Error deleting from Cloudinary:', cloudError);
      }
    } else if (file.storage_provider === 'local') {
      // Delete local file
      const localPath = path.join(__dirname, '..', '..', 'public', file.file_path);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
          console.log('✅ Deleted local file:', localPath);
        } catch (unlinkError) {
          console.error('Error deleting local file:', unlinkError);
        }
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

    // Increment download count
    await FileUpload.findByIdAndUpdate(req.params.id, {
      $inc: { download_count: 1 }
    });

    // For Cloudinary files, redirect to the URL
    if (file.storage_provider === 'cloudinary') {
      return res.redirect(file.file_url);
    }

    // For local files, send the file
    const localPath = path.join(__dirname, '..', '..', 'public', file.file_path);

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({
        success: false,
        message: 'Physical file not found'
      });
    }

    // Encode filename properly
    const encodedFilename = encodeURIComponent(file.original_name);
    const safeFilename = file.original_name.replace(/[^\w\s.-]/g, '_');

    res.setHeader('Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);

    res.sendFile(path.resolve(localPath));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getUserFiles,
  getFile,
  deleteFile,
  downloadFile,
  isCloudinaryConfigured
};
