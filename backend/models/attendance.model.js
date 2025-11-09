const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
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
  class: {
    type: Number,
    required: true,
  },
  totalClasses: {
    type: Number,
    required: true,
    default: 0,
  },
  classesAttended: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  timestamps: true,
});

// Create compound index to ensure unique attendance record per student-subject-class
attendanceSchema.index({ studentId: 1, subjectId: 1, class: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);

