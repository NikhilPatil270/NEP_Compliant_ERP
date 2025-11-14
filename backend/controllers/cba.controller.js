const CBA = require("../models/cba.model");

const addOrUpdateCBAController = async (req, res) => {
  try {
    const {
      studentId,
      subjectId,
      examId,
      class: classNum,
      competencies,
    } = req.body;
    const facultyId = req.userId;

    if (
      !studentId ||
      !subjectId ||
      !examId ||
      !classNum ||
      !competencies
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const {
      understandingOfConcepts,
      applicationReasoning,
      communication,
      participationEffortAttitude,
    } = competencies;

    if (
      !understandingOfConcepts ||
      !applicationReasoning ||
      !communication ||
      !participationEffortAttitude
    ) {
      return res.status(400).json({
        success: false,
        message: "All competencies must be provided",
      });
    }

    const validValues = [
      "Needs Improvement",
      "Approaching Expectations",
      "Meets Expectations",
    ];

    if (
      !validValues.includes(understandingOfConcepts) ||
      !validValues.includes(applicationReasoning) ||
      !validValues.includes(communication) ||
      !validValues.includes(participationEffortAttitude)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid competency value",
      });
    }

    const cbaData = {
      studentId,
      subjectId,
      examId,
      class: classNum,
      competencies: {
        understandingOfConcepts,
        applicationReasoning,
        communication,
        participationEffortAttitude,
      },
      facultyId,
    };

    const existingCBA = await CBA.findOne({
      studentId,
      subjectId,
      examId,
      class: classNum,
    });

    let cba;
    if (existingCBA) {
      existingCBA.competencies = cbaData.competencies;
      existingCBA.facultyId = facultyId;
      cba = await existingCBA.save();
    } else {
      cba = await CBA.create(cbaData);
    }

    res.json({
      success: true,
      message: "CBA score saved successfully",
      data: cba,
    });
  } catch (error) {
    console.error("Error in addOrUpdateCBAController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error saving CBA score",
    });
  }
};

const getCBAController = async (req, res) => {
  try {
    const { studentId, subjectId, examId, class: classNum } = req.query;

    if (!studentId || !subjectId || !examId || !classNum) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameters",
      });
    }

    const cba = await CBA.findOne({
      studentId,
      subjectId,
      examId,
      class: Number(classNum),
    })
      .populate("subjectId", "name")
      .populate("examId", "name examType")
      .populate("studentId", "enrollmentNo firstName lastName");

    if (!cba) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "CBA score not found",
      });
    }

    res.json({
      success: true,
      message: "CBA score retrieved successfully",
      data: cba,
    });
  } catch (error) {
    console.error("Error in getCBAController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving CBA score",
    });
  }
};

const getStudentCBAController = async (req, res) => {
  try {
    const { class: classNum } = req.query;
    const studentId = req.userId;

    if (!classNum) {
      return res.status(400).json({
        success: false,
        message: "Class is required",
      });
    }

    const cbas = await CBA.find({
      studentId,
      class: Number(classNum),
    })
      .populate("subjectId", "name")
      .populate("examId", "name examType");

    res.json({
      success: true,
      message: "CBA scores retrieved successfully",
      data: cbas,
    });
  } catch (error) {
    console.error("Error in getStudentCBAController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving CBA scores",
    });
  }
};

const getBulkCBAController = async (req, res) => {
  try {
    const { studentIds, subjectId, examId, class: classNum } = req.query;

    if (!studentIds || !subjectId || !examId || !classNum) {
      return res.status(400).json({
        success: false,
        message: "Missing required query parameters",
      });
    }

    const studentIdArray = Array.isArray(studentIds)
      ? studentIds
      : studentIds.split(",");

    const cbas = await CBA.find({
      studentId: { $in: studentIdArray },
      subjectId,
      examId,
      class: Number(classNum),
    })
      .populate("studentId", "enrollmentNo firstName lastName");

    res.json({
      success: true,
      message: "CBA scores retrieved successfully",
      data: cbas,
    });
  } catch (error) {
    console.error("Error in getBulkCBAController:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error retrieving CBA scores",
    });
  }
};

module.exports = {
  addOrUpdateCBAController,
  getCBAController,
  getStudentCBAController,
  getBulkCBAController,
};

