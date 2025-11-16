const mongoose = require("mongoose");

const MaterialView = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentDetail",
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure one view record per student-material combination
MaterialView.index({ material: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("MaterialView", MaterialView);

