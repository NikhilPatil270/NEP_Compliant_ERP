const express = require("express");
const {
  setTotalClassesController,
  getTotalClassesController,
  getStudentsWithAttendanceController,
  updateBulkAttendanceController,
  getStudentAttendanceController,
} = require("../controllers/attendance.controller");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();

// Routes for faculty
router.post("/total-classes", auth, setTotalClassesController);
router.get("/total-classes", auth, getTotalClassesController);
router.get("/students", auth, getStudentsWithAttendanceController);
router.post("/bulk", auth, updateBulkAttendanceController);

// Route for students
router.get("/student", auth, getStudentAttendanceController);

module.exports = router;

