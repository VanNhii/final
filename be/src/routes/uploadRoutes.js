const express = require('express');
const { protect } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const {
  uploadFile,
  getUserFiles,
  getFile,
  deleteFile,
  downloadFile
} = require('../controllers/uploadController');

const router = express.Router();

router.use(protect); // All routes below require authentication

// Check if Cloudinary is configured
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

// Dynamic middleware selection based on storage configuration
let uploadMiddleware, postUploadMiddleware, errorHandler;

if (isCloudinaryConfigured) {
  try {
    const { cloudinaryUpload, uploadToCloudinary, handleCloudinaryError } = require('../middleware/cloudinaryUpload');
    uploadMiddleware = cloudinaryUpload.single('file');
    postUploadMiddleware = uploadToCloudinary;
    errorHandler = handleCloudinaryError;
    console.log('📁 Upload: Using Cloudinary cloud storage');
  } catch (error) {
    console.warn('⚠️ Cloudinary packages not installed, falling back to local storage');
    uploadMiddleware = upload.single('file');
    postUploadMiddleware = (req, res, next) => next();
    errorHandler = handleMulterError;
  }
} else {
  uploadMiddleware = upload.single('file');
  postUploadMiddleware = (req, res, next) => next();
  errorHandler = handleMulterError;
  console.log('📁 Upload: Using local storage');
}

// Upload file endpoint
router.post('/', uploadMiddleware, errorHandler, postUploadMiddleware, uploadFile);

// Get user's uploaded files
router.get('/', getUserFiles);

// Get file details
router.get('/:id', getFile);

// Download file
router.get('/:id/download', downloadFile);

// Delete file
router.delete('/:id', deleteFile);

module.exports = router;

