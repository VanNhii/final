const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const slugify = require('slugify');
const streamifier = require('streamifier');

// Use memory storage - file goes to buffer, then we upload to Cloudinary
const memoryStorage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.pdf', '.doc', '.docx',
    ];

    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        const error = new Error(`Loại file không được hỗ trợ: ${file.mimetype}`);
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// Multer instance with memory storage
const cloudinaryUpload = multer({
    storage: memoryStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
    }
});

// Middleware to upload buffer to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const uploadPurpose = req.query.upload_purpose || req.body.upload_purpose || 'cv';
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        // Create safe filename WITH extension
        const baseName = path.basename(req.file.originalname, fileExtension);
        const safeBaseName = slugify(baseName, {
            lower: true,
            strict: true
        }) || 'file';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

        // INCLUDE extension in public_id for raw files
        const publicId = `${safeBaseName}-${uniqueSuffix}${fileExtension}`;

        // Determine resource type
        const isRawFile = req.file.mimetype === 'application/pdf' ||
            req.file.mimetype.includes('word') ||
            req.file.mimetype.includes('document');

        // Upload to Cloudinary using stream
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `job-portal/${uploadPurpose}`,
                    public_id: publicId,
                    resource_type: isRawFile ? 'raw' : 'auto',
                    use_filename: true,
                    unique_filename: false,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });

        const result = await uploadPromise;

        // Add Cloudinary info to req.file
        req.file.cloudinary = result;
        req.file.path = result.secure_url; // This is the full URL
        req.file.filename = result.public_id;

        console.log('✅ Uploaded to Cloudinary:', result.secure_url);

        next();
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi upload file lên cloud',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Error handling middleware
const handleCloudinaryError = (error, req, res, next) => {
    if (error) {
        console.error('Upload error:', error);

        if (error.code === 'INVALID_FILE_TYPE') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File quá lớn. Kích thước tối đa là 10MB.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi khi upload file',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
    next();
};

module.exports = {
    cloudinaryUpload,
    uploadToCloudinary,
    handleCloudinaryError
};
