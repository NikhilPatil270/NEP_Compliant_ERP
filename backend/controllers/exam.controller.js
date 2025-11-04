const Exam = require("../models/exam.model");
const ApiResponse = require("../utils/ApiResponse");

const getAllExamsController = async (req, res) => {
  try {
    const { search = "", examType = "", class: classNum = "" } = req.query;

    let query = {};

    if (classNum) query.class = classNum;
    if (examType) query.examType = examType;

    const exams = await Exam.find(query).populate("schedules.subject");

    if (!exams || exams.length === 0) {
      return ApiResponse.error("No Exams Found", 404).send(res);
    }

    return ApiResponse.success(exams, "All Exams Loaded!").send(res);
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

const addExamController = async (req, res) => {
  try {
    const formData = { ...req.body };
    // schedules may arrive as JSON string when multipart/form-data is used
    if (typeof formData.schedules === "string") {
      try {
        formData.schedules = JSON.parse(formData.schedules);
      } catch (e) {
        formData.schedules = [];
      }
    }
    if (!Array.isArray(formData.schedules)) {
      formData.schedules = [];
    }

    if (req.file) {
      formData.timetableLink = req.file.filename;
    }

    // derive startDate/endDate from schedules if provided
    if (formData.schedules.length > 0) {
      const dates = formData.schedules
        .map((s) => new Date(s.date))
        .filter((d) => !isNaN(d));
      if (dates.length > 0) {
        formData.startDate = new Date(Math.min(...dates));
        formData.endDate = new Date(Math.max(...dates));
      }
      // ensure marks provided per subject for schedule-based creation
      const missingMarks = formData.schedules.some(
        (s) => s.marks === undefined || s.marks === null || isNaN(Number(s.marks))
      );
      if (missingMarks) {
        return ApiResponse.error("Provide marks for each scheduled subject.", 400).send(res);
      }
    }

    // basic validation: either schedules or a timetable file should exist
    if ((!formData.schedules || formData.schedules.length === 0) && !formData.timetableLink) {
      return ApiResponse.error("Provide schedules or upload a timetable file.", 400).send(res);
    }

    const exam = await Exam.create(formData);
    return ApiResponse.success(exam, "Exam Added Successfully!").send(res);
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

const updateExamController = async (req, res) => {
  try {
    const formData = { ...req.body };
    if (typeof formData.schedules === "string") {
      try {
        formData.schedules = JSON.parse(formData.schedules);
      } catch (e) {
        formData.schedules = [];
      }
    }
    if (!Array.isArray(formData.schedules)) {
      formData.schedules = [];
    }
    if (req.file) {
      formData.timetableLink = req.file.filename;
    }
    if (formData.schedules.length > 0) {
      const dates = formData.schedules
        .map((s) => new Date(s.date))
        .filter((d) => !isNaN(d));
      if (dates.length > 0) {
        formData.startDate = new Date(Math.min(...dates));
        formData.endDate = new Date(Math.max(...dates));
      } else {
        formData.startDate = undefined;
        formData.endDate = undefined;
      }
      const missingMarks = formData.schedules.some(
        (s) => s.marks === undefined || s.marks === null || isNaN(Number(s.marks))
      );
      if (missingMarks) {
        return ApiResponse.error("Provide marks for each scheduled subject.", 400).send(res);
      }
    }

    const exam = await Exam.findByIdAndUpdate(req.params.id, formData, {
      new: true,
    });
    return ApiResponse.success(exam, "Exam Updated Successfully!").send(res);
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

const deleteExamController = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    return ApiResponse.success(exam, "Exam Deleted Successfully!").send(res);
  } catch (error) {
    return ApiResponse.error(error.message).send(res);
  }
};

module.exports = {
  getAllExamsController,
  addExamController,
  updateExamController,
  deleteExamController,
};
