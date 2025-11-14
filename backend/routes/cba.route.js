const express = require("express");
const {
  addOrUpdateCBAController,
  getCBAController,
  getStudentCBAController,
  getBulkCBAController,
} = require("../controllers/cba.controller");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/", auth, addOrUpdateCBAController);
router.get("/", auth, getCBAController);
router.get("/student", auth, getStudentCBAController);
router.get("/bulk", auth, getBulkCBAController);

module.exports = router;

