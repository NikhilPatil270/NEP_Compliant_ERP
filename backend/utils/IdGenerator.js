const studentDetails = require('../models/details/student-details.model');
const facultyDetails = require('../models/details/faculty-details.model');

const SUBJECT_CODES = {
    MATHS: 1,
    ENGLISH: 2,
    HINDI: 3,
    EVS: 4,
    SPORTS_YOGA: 5,
    ART_MUSIC: 6
};

const generateStudentId = async (classNum) => {
    try {
        // Find the highest enrollment number for the given class
        const highestStudent = await studentDetails
            .findOne({ class: classNum })
            .sort({ enrollmentNo: -1 })
            .select('enrollmentNo');

        let nextNumber = 1;
        if (highestStudent) {
            // Extract the sequence number from the enrollment number
            const currentSeq = highestStudent.enrollmentNo % 1000;
            nextNumber = currentSeq + 1;
        }

        // Generate new enrollment number (classNum * 1000 + sequence)
        const enrollmentNo = (classNum * 1000) + nextNumber;
        return enrollmentNo;
    } catch (error) {
        console.error('Error generating student ID:', error);
        throw error;
    }
};

const generateFacultyId = async (subject) => {
    try {
        let subjectCode = SUBJECT_CODES[subject.toUpperCase()];
        if (!subjectCode) {
            throw new Error('Invalid subject code');
        }

        // Find the highest employee ID for the given subject code
        const highestFaculty = await facultyDetails
            .findOne({
                employeeId: { 
                    $gte: subjectCode * 1000,
                    $lt: (subjectCode + 1) * 1000
                }
            })
            .sort({ employeeId: -1 })
            .select('employeeId');

        let nextNumber = 1;
        if (highestFaculty) {
            // Extract the sequence number from the employee ID
            const currentSeq = highestFaculty.employeeId % 1000;
            nextNumber = currentSeq + 1;
        }

        // Generate new employee ID (subjectCode * 1000 + sequence)
        const employeeId = (subjectCode * 1000) + nextNumber;
        return employeeId;
    } catch (error) {
        console.error('Error generating faculty ID:', error);
        throw error;
    }
};

module.exports = {
    generateStudentId,
    generateFacultyId,
    SUBJECT_CODES
};