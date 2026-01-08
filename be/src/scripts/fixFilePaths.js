/**
 * Migration script to fix file paths in database
 * Converts full disk paths to web-accessible paths
 * Run with: node src/scripts/fixFilePaths.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import models
const FileUpload = require('../models/FileUpload');
const Application = require('../models/Application');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const fixFilePaths = async () => {
    try {
        console.log('🔧 Starting file path migration...\n');

        // Fix FileUpload collection
        const fileUploads = await FileUpload.find({
            file_path: { $regex: /^[A-Za-z]:\\/ } // Matches Windows paths like "d:\"
        });

        console.log(`Found ${fileUploads.length} FileUpload records with disk paths`);

        for (const file of fileUploads) {
            const oldPath = file.file_path;

            // Extract the filename from the path
            const fileName = path.basename(oldPath);
            const subDir = file.upload_purpose || 'cv';

            // Create web-accessible path
            const newPath = `/uploads/${subDir}/${fileName}`;

            console.log(`  Updating: ${oldPath} → ${newPath}`);

            file.file_path = newPath;
            await file.save();
        }

        // Fix Application collection
        const applications = await Application.find({
            cv_url: { $regex: /^[A-Za-z]:\\/ } // Matches Windows paths
        });

        console.log(`\nFound ${applications.length} Application records with disk paths`);

        for (const app of applications) {
            const oldPath = app.cv_url;

            // Extract the filename
            const fileName = path.basename(oldPath);

            // Create web-accessible path
            const newPath = `/uploads/cv/${fileName}`;

            console.log(`  Updating: ${oldPath} → ${newPath}`);

            app.cv_url = newPath;
            await app.save();
        }

        console.log('\n✅ Migration completed successfully!');
        console.log(`   - Fixed ${fileUploads.length} FileUpload records`);
        console.log(`   - Fixed ${applications.length} Application records`);

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
};

// Run migration
(async () => {
    await connectDB();
    await fixFilePaths();
})();
