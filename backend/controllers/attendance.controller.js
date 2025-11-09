const Attendance = require("../models/attendance.model");
const AttendanceConfig = require("../models/attendance-config.model");
const Student = require("../models/details/student-details.model");

// Set total classes for a subject-class combination (one-time global setting)
const setTotalClassesController = async (req, res) => {
  try {
    const { subjectId, class: classNum, totalClasses } = req.body;

    if (!subjectId || !classNum || totalClasses === undefined || totalClasses < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid input data. subjectId, class, and totalClasses are required",
      });
    }

    // Create or update the attendance config
    let config = await AttendanceConfig.findOne({
      subjectId,
      class: Number(classNum),
    });

    if (config) {
      // Update existing config and all related attendance records
      const oldTotalClasses = config.totalClasses;
      config.totalClasses = Number(totalClasses);
      await config.save();

      // Update all attendance records for this subject-class to use new totalClasses
      await Attendance.updateMany(
        { subjectId, class: Number(classNum) },
        { totalClasses: Number(totalClasses) }
      );
    } else {
      // Create new config
      config = await AttendanceConfig.create({
        subjectId,
        class: Number(classNum),
        totalClasses: Number(totalClasses),
      });
    }

    res.json({
      success: true,
      message: "Total classes set successfully",
      data: config,
    });
  } catch (error) {
    console.error("Error in setTotalClassesController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error setting total classes",
    });
  }
};

// Get total classes for a subject-class combination
const getTotalClassesController = async (req, res) => {
  try {
    const { subjectId, class: classNum } = req.query;

    if (!subjectId || !classNum) {
      return res.status(400).json({
        success: false,
        message: "subjectId and class are required",
      });
    }

    const config = await AttendanceConfig.findOne({
      subjectId,
      class: Number(classNum),
    });

    if (!config) {
      return res.status(200).json({
        success: true,
        data: { totalClasses: 0 },
        message: "Total classes not set for this subject-class",
      });
    }

    res.json({
      success: true,
      message: "Total classes retrieved successfully",
      data: config,
    });
  } catch (error) {
    console.error("Error in getTotalClassesController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving total classes",
    });
  }
};

// Get students with attendance for a subject-class combination
const getStudentsWithAttendanceController = async (req, res) => {
  try {
    const { subject, class: classNum } = req.query;

    if (!subject || !classNum) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: subject and class are required",
      });
    }

    // Get total classes from config
    const config = await AttendanceConfig.findOne({
      subjectId: subject,
      class: Number(classNum),
    });

    const totalClasses = config ? config.totalClasses : 0;

    // Get all students for the class
    const students = await Student.find({
      class: Number(classNum),
    }).select("_id enrollmentNo firstName lastName");

    if (!students || students.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        totalClasses,
        message: "No students found for the specified criteria",
      });
    }

    // Get attendance records for these students
    const attendanceRecords = await Attendance.find({
      studentId: { $in: students.map((s) => s._id) },
      subjectId: subject,
      class: Number(classNum),
    });

    // Combine student data with attendance
    const studentsWithAttendance = students.map((student) => {
      const attendance = attendanceRecords.find(
        (a) => a.studentId.toString() === student._id.toString()
      );
      return {
        ...student.toObject(),
        classesAttended: attendance ? attendance.classesAttended : 0,
        totalClasses: attendance ? attendance.totalClasses : totalClasses,
      };
    });

    res.json({
      success: true,
      message: "Students retrieved successfully with attendance",
      data: studentsWithAttendance,
      totalClasses,
    });
  } catch (error) {
    console.error("Error in getStudentsWithAttendanceController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving students with attendance",
    });
  }
};

// Update bulk attendance for students
const updateBulkAttendanceController = async (req, res) => {
  try {
    const { attendance, subjectId, class: classNum } = req.body;

    if (!attendance || !Array.isArray(attendance) || !subjectId || !classNum) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid input data. Required: attendance array, subjectId, and class",
      });
    }

    // Get or create attendance config to ensure totalClasses is set
    const config = await AttendanceConfig.findOne({
      subjectId,
      class: Number(classNum),
    });

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Total classes must be set before updating attendance",
      });
    }

    const totalClasses = config.totalClasses;

    const results = [];
    for (const attendanceData of attendance) {
      const classesAttended = Number(attendanceData.classesAttended);
      
      // Validate that classesAttended doesn't exceed totalClasses
      if (classesAttended > totalClasses) {
        return res.status(400).json({
          success: false,
          message: `Classes attended (${classesAttended}) cannot exceed total classes (${totalClasses})`,
        });
      }
      
      if (classesAttended < 0) {
        return res.status(400).json({
          success: false,
          message: "Classes attended cannot be negative",
        });
      }

      const existingAttendance = await Attendance.findOne({
        studentId: attendanceData.studentId,
        subjectId,
        class: Number(classNum),
      });

      if (existingAttendance) {
        existingAttendance.classesAttended = classesAttended;
        existingAttendance.totalClasses = totalClasses;
        await existingAttendance.save();
        results.push(existingAttendance);
      } else {
        const newAttendance = await Attendance.create({
          studentId: attendanceData.studentId,
          subjectId,
          class: Number(classNum),
          totalClasses: totalClasses,
          classesAttended: classesAttended,
        });
        results.push(newAttendance);
      }
    }

    res.json({
      success: true,
      message: "Attendance updated successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error in updateBulkAttendanceController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error updating attendance",
    });
  }
};

// Get student attendance (for student view)
const getStudentAttendanceController = async (req, res) => {
  try {
    const { class: classNum } = req.query;
    const studentId = req.userId;

    if (!classNum) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    const attendanceRecords = await Attendance.find({
      studentId,
      class: Number(classNum),
    })
      .populate("subjectId", "name code")
      .sort({ "subjectId.name": 1 });

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No attendance records found for this class",
      });
    }

    // Calculate percentage for each subject
    const attendanceWithPercentage = attendanceRecords.map((record) => {
      const percentage =
        record.totalClasses > 0
          ? ((record.classesAttended / record.totalClasses) * 100).toFixed(2)
          : 0;
      return {
        ...record.toObject(),
        attendancePercentage: parseFloat(percentage),
      };
    });

    res.json({
      success: true,
      message: "Attendance retrieved successfully",
      data: attendanceWithPercentage,
    });
  } catch (error) {
    console.error("Error in getStudentAttendanceController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving attendance",
    });
  }
};

module.exports = {
  setTotalClassesController,
  getTotalClassesController,
  getStudentsWithAttendanceController,
  updateBulkAttendanceController,
  getStudentAttendanceController,
};

