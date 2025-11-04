const mongoose = require('mongoose');
const studentDetails = require('../models/details/student-details.model');

// Migration script to remove branchId field from existing students
// This script should be run after updating the student model

async function removeStudentBranchId() {
  try {
    console.log('Starting migration: Removing branchId from students...');
    
    // Update all students to remove the branchId field
    const result = await studentDetails.updateMany(
      {}, // Match all documents
      { $unset: { branchId: 1 } } // Remove the branchId field
    );
    
    console.log(`Migration completed successfully. Updated ${result.modifiedCount} student records.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-management', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    return removeStudentBranchId();
  })
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = removeStudentBranchId;
