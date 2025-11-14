const mongoose = require("mongoose");

const cbaSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StudentDetail",
    required: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
  },
  class: {
    type: Number,
    required: true,
  },
  competencies: {
    understandingOfConcepts: {
      type: String,
      enum: ["Needs Improvement", "Approaching Expectations", "Meets Expectations"],
      required: true,
    },
    applicationReasoning: {
      type: String,
      enum: ["Needs Improvement", "Approaching Expectations", "Meets Expectations"],
      required: true,
    },
    communication: {
      type: String,
      enum: ["Needs Improvement", "Approaching Expectations", "Meets Expectations"],
      required: true,
    },
    participationEffortAttitude: {
      type: String,
      enum: ["Needs Improvement", "Approaching Expectations", "Meets Expectations"],
      required: true,
    },
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FacultyDetail",
    required: true,
  },
}, { timestamps: true });

// Ensure one CBA record per student, subject, exam, and class combination
cbaSchema.index({ studentId: 1, subjectId: 1, examId: 1, class: 1 }, { unique: true });

module.exports = mongoose.model("CBA", cbaSchema);

