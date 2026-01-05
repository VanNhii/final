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

// Upload file endpoint
router.post('/', upload.single('file'), handleMulterError, uploadFile);

// Get user's uploaded files
router.get('/', getUserFiles);

// Get file details
router.get('/:id', getFile);

// Download file
router.get('/:id/download', downloadFile);

// Delete file
router.delete('/:id', deleteFile);

module.exports = router;
