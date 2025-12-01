const Material = require("../models/material.model");
const MaterialView = require("../models/material-view.model");
const StudentDetail = require("../models/details/student-details.model");
const ApiResponse = require("../utils/ApiResponse");
const { uploadFile } = require("../utils/imagekit");

const getMaterialsController = async (req, res) => {
  try {
    const { subject, faculty, class: classNum, branch, type } = req.query;
    let query = {};

    if (subject) query.subject = subject;
    if (faculty) query.faculty = faculty;
    if (classNum) query.class = classNum;
    if (branch) query.branch = branch;
    if (type) query.type = type;

    const materials = await Material.find(query)
      .populate("subject")
      .populate("faculty")
      .populate("branch")
      .sort({ createdAt: -1 });

    if (!materials || materials.length === 0) {
      return ApiResponse.notFound("No materials found").send(res);
    }

    return ApiResponse.success(
      materials,
      "Materials retrieved successfully"
    ).send(res);
  } catch (error) {
    console.error("Get Materials Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const addMaterialController = async (req, res) => {
  try {
    const { title, subject, class: classNum, branch, type } = req.body;

    if (!title || !subject || !classNum || !branch || !type) {
      return ApiResponse.badRequest("All fields are required").send(res);
    }

    if (!req.file) {
      return ApiResponse.badRequest("Material file is required").send(res);
    }

    if (!["notes", "assignment", "syllabus", "other"].includes(type)) {
      return ApiResponse.badRequest("Invalid material type").send(res);
    }

    // Upload file to ImageKit
    const uploadResult = await uploadFile(
      req.file.buffer,
      req.file.originalname
    );

    const material = await Material.create({
      title,
      subject,
      faculty: req.userId, // From auth middleware
      class: classNum,
      branch,
      type,
      // Store ImageKit URL (or you can store uploadResult.fileId if needed)
      file: uploadResult.url,
    });

    const populatedMaterial = await Material.findById(material._id)
      .populate("subject")
      .populate("faculty")
      .populate("branch");

    return ApiResponse.created(
      populatedMaterial,
      "Material added successfully"
    ).send(res);
  } catch (error) {
    console.error("Add Material Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const updateMaterialController = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, class: classNum, branch, type } = req.body;

    if (!id) {
      return ApiResponse.badRequest("Material ID is required").send(res);
    }

    const material = await Material.findById(id);

    if (!material) {
      return ApiResponse.notFound("Material not found").send(res);
    }

    if (material.faculty.toString() !== req.userId) {
      return ApiResponse.unauthorized(
        "You are not authorized to update this material"
      ).send(res);
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (subject) updateData.subject = subject;
    if (classNum) updateData.class = classNum;
    if (branch) updateData.branch = branch;
    if (type) {
      if (!["notes", "assignment", "syllabus", "other"].includes(type)) {
        return ApiResponse.badRequest("Invalid material type").send(res);
      }
      updateData.type = type;
    }
    if (req.file) {
      const uploadResult = await uploadFile(
        req.file.buffer,
        req.file.originalname
      );
      updateData.file = uploadResult.url;
    }

    const updatedMaterial = await Material.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("subject")
      .populate("faculty")
      .populate("branch");

    return ApiResponse.success(
      updatedMaterial,
      "Material updated successfully"
    ).send(res);
  } catch (error) {
    console.error("Update Material Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const deleteMaterialController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ApiResponse.badRequest("Material ID is required").send(res);
    }

    const material = await Material.findById(id);

    if (!material) {
      return ApiResponse.notFound("Material not found").send(res);
    }

    if (material.faculty.toString() !== req.userId) {
      return ApiResponse.unauthorized(
        "You are not authorized to delete this material"
      ).send(res);
    }

    await Material.findByIdAndDelete(id);

    return ApiResponse.success(null, "Material deleted successfully").send(res);
  } catch (error) {
    console.error("Delete Material Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const trackMaterialViewController = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.userId; // From auth middleware - student's ID

    if (!id) {
      return ApiResponse.badRequest("Material ID is required").send(res);
    }

    const material = await Material.findById(id);

    if (!material) {
      return ApiResponse.notFound("Material not found").send(res);
    }

    // Check if view already exists
    const existingView = await MaterialView.findOne({
      material: id,
      student: studentId,
    });

    if (existingView) {
      // View already tracked, just return success
      return ApiResponse.success(
        existingView,
        "Material view already tracked"
      ).send(res);
    }

    // Create new view record
    const materialView = await MaterialView.create({
      material: id,
      student: studentId,
    });

    return ApiResponse.success(
      materialView,
      "Material view tracked successfully"
    ).send(res);
  } catch (error) {
    console.error("Track Material View Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

const getMaterialViewsController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ApiResponse.badRequest("Material ID is required").send(res);
    }

    const material = await Material.findById(id);

    if (!material) {
      return ApiResponse.notFound("Material not found").send(res);
    }

    // Check if faculty owns this material
    if (material.faculty.toString() !== req.userId) {
      return ApiResponse.unauthorized(
        "You are not authorized to view this material's statistics"
      ).send(res);
    }

    // Get all students in the same class and branch as the material
    const allStudents = await StudentDetail.find({
      class: material.class,
      status: "active",
    }).select("_id enrollmentNo firstName middleName lastName");

    // Get all views for this material
    const views = await MaterialView.find({ material: id })
      .populate("student", "enrollmentNo firstName middleName lastName")
      .sort({ viewedAt: -1 });

    const viewedStudentIds = new Set(
      views.map((view) => view.student._id.toString())
    );

    // Separate students into viewed and non-viewed
    const viewedStudents = views.map((view, index) => ({
      serialNo: index + 1,
      studentId: view.student.enrollmentNo,
      studentName: `${view.student.firstName} ${view.student.middleName} ${view.student.lastName}`,
    }));

    const nonViewedStudents = allStudents
      .filter((student) => !viewedStudentIds.has(student._id.toString()))
      .map((student, index) => ({
        serialNo: index + 1,
        studentId: student.enrollmentNo,
        studentName: `${student.firstName} ${student.middleName} ${student.lastName}`,
      }));

    return ApiResponse.success(
      {
        viewed: viewedStudents,
        nonViewed: nonViewedStudents,
      },
      "Material views retrieved successfully"
    ).send(res);
  } catch (error) {
    console.error("Get Material Views Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

module.exports = {
  getMaterialsController,
  addMaterialController,
  updateMaterialController,
  deleteMaterialController,
  trackMaterialViewController,
  getMaterialViewsController,
};
