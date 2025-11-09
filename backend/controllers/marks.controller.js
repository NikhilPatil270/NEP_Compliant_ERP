const Marks = require("../models/marks.model");
const Student = require("../models/details/student-details.model");

const getMarksController = async (req, res) => {
  try {
    const { studentId, class: classNum, examId } = req.query;

    const query = { student: studentId };
    if (classNum) {
      query.class = classNum;
    }

    if (examId) {
      query.examId = examId;
    }

    const marks = await Marks.find(query)
      .populate("branch", "name")
      .populate("marks.subject", "name")
      .populate("student", "firstName lastName enrollmentNo");

    if (!marks || marks.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No marks found for the specified criteria",
      });
    }

    res.json({
      success: true,
      message: "Marks retrieved successfully",
      data: marks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const addMarksController = async (req, res) => {
  try {
    const { studentId, class: classNum, branch, marks } = req.body;

    if (!studentId || !classNum  || !marks || !Array.isArray(marks)) {
      return res.status(400).json({
        success: false,
        message: "Invalid input data",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    let existingMarks = await Marks.findOne({ student: studentId, class: classNum });

    if (existingMarks) {
      existingMarks.marks = marks;
      await existingMarks.save();
    } else {
      existingMarks = await Marks.create({
        student: studentId,
        class: classNum,
        
        marks,
      });
    }

    res.json({
      success: true,
      message: "Marks updated successfully",
      data: existingMarks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const deleteMarksController = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMarks = await Marks.findByIdAndDelete(id);

    if (!deletedMarks) {
      return res.status(404).json({
        success: false,
        message: "Marks not found",
      });
    }

    res.json({
      success: true,
      message: "Marks deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const addBulkMarksController = async (req, res) => {
  try {
    const { marks, examId, subjectId, class: classNum } = req.body;

    if (!marks || !Array.isArray(marks) || !examId || !subjectId || !classNum) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid input data. Required: marks array, examId, subjectId, and class",
      });
    }

    const results = [];
    for (const markData of marks) {
      const existingMark = await Marks.findOne({
        studentId: markData.studentId,
        examId,
        subjectId,
        class: classNum,
      });

      if (existingMark) {
        existingMark.marksObtained = markData.obtainedMarks;
        await existingMark.save();
        results.push(existingMark);
      } else {
        const newMark = await Marks.create({
          studentId: markData.studentId,
          examId,
          subjectId,
          class: classNum,
          marksObtained: markData.obtainedMarks,
        });
        results.push(newMark);
      }
    }

    res.json({
      success: true,
      message: "Marks submitted successfully",
      data: results,
    });
  } catch (error) {
    console.error("Error in addBulkMarksController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error submitting marks",
    });
  }
};

const getStudentsWithMarksController = async (req, res) => {
  try {
    const { branch, subject, class: classNum, examId } = req.query;

    if ( !subject || !classNum || !examId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: branch, subject, class, and examId are required",
      });
    }

    const students = await Student.find({
      class: Number(classNum),
    }).select("_id enrollmentNo firstName lastName");

    if (!students || students.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No students found for the specified criteria",
      });
    }

    const marks = await Marks.find({
      studentId: { $in: students.map((s) => s._id) },
      examId,
      subjectId: subject,
      class: Number(classNum),
    });

    const studentsWithMarks = students.map((student) => {
      const studentMarks = marks.find(
        (m) => m.studentId.toString() === student._id.toString()
      );
      return {
        ...student.toObject(),
        obtainedMarks: studentMarks ? studentMarks.marksObtained : 0,
      };
    });

    res.json({
      success: true,
      message: "Students retrieved successfully with marks",
      data: studentsWithMarks,
    });
  } catch (error) {
    console.error("Error in getStudentsWithMarksController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving students with marks",
    });
  }
};

const getStudentMarksController = async (req, res) => {
  try {
    const { class: classNum } = req.query;
    const studentId = req.userId;

    if (!classNum) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    const marks = await Marks.find({
      studentId,
      class: Number(classNum),
    })
      .populate("subjectId", "name")
      .populate("examId", "name examType totalMarks");

    if (!marks || marks.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No marks found for this class",
      });
    }

    res.json({
      success: true,
      message: "Marks retrieved successfully",
      data: marks,
    });
  } catch (error) {
    console.error("Error in getStudentMarksController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving marks",
    });
  }
};

module.exports = {
  getMarksController,
  addMarksController,
  deleteMarksController,
  addBulkMarksController,
  getStudentsWithMarksController,
  getStudentMarksController,
};
