const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g., "09:30"
    endTime: { type: String, required: true },
    marks: { type: Number },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    // Overall class for which this exam is scheduled
    class: {
      type: Number,
      required: true,
    },
    examType: {
      type: String,
      required: true,
      enum: ["mid", "end"],
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    // Optional file upload remains supported for backward compatibility
    timetableLink: {
      type: String,
    },
    // Batch schedule for subjects under the same exam entity
    schedules: {
      type: [scheduleSchema],
      default: [],
    },
    // Derived convenience fields for list views (min/max dates across schedules)
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
