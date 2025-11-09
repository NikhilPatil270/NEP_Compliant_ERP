const mongoose = require("mongoose");

const attendanceConfigSchema = new mongoose.Schema({
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
}, {
  timestamps: true,
});

// Create compound index to ensure unique config per subject-class
attendanceConfigSchema.index({ subjectId: 1, class: 1 }, { unique: true });

module.exports = mongoose.model("AttendanceConfig", attendanceConfigSchema);

