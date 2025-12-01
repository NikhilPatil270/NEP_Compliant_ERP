const PDFDocument = require("pdfkit");
const studentDetails = require("../models/details/student-details.model");
const Marks = require("../models/marks.model");
const Subject = require("../models/subject.model");
const Exam = require("../models/exam.model");
const ApiResponse = require("../utils/ApiResponse");
const path = require("path");

// No longer needed - using exam type directly

// Helper function to calculate percentage and grade
const calculateGrade = (marksObtained, totalMarks) => {
  if (!marksObtained || !totalMarks || totalMarks === 0) return { percentage: 0, grade: "-" };
  const percentage = (marksObtained / totalMarks) * 100;
  let grade;
  if (percentage >= 90) grade = "A";
  else if (percentage >= 80) grade = "B";
  else if (percentage >= 60) grade = "C";
  else grade = "D";
  return { percentage: Math.round(percentage), grade };
};

// Helper function to generate feedback based on performance
const generateFeedback = (marksData) => {
  const feedbacks = [];
  
  // Calculate overall average
  let totalMarks = 0;
  let totalObtained = 0;
  let subjectCount = 0;
  
  marksData.forEach((subject) => {
    const exams = [subject.midSem, subject.endSem];
    exams.forEach((exam) => {
      if (exam && exam.marksObtained !== undefined && exam.totalMarks) {
        totalObtained += exam.marksObtained;
        totalMarks += exam.totalMarks;
        subjectCount++;
      }
    });
  });
  
  const overallPercentage = totalMarks > 0 ? (totalObtained / totalMarks) * 100 : 0;
  
  // Generate feedback based on overall performance
  if (overallPercentage >= 90) {
    feedbacks.push(
      "Excellent performance throughout the semester! You have demonstrated outstanding understanding and consistency across all subjects. Keep up the exceptional work!"
    );
    feedbacks.push(
      "Your dedication to academic excellence is commendable. Continue to challenge yourself and maintain this high standard of achievement."
    );
  } else if (overallPercentage >= 80) {
    feedbacks.push(
      "Very good performance! You have shown strong understanding of the subjects and consistent effort in both mid and end semester exams."
    );
    feedbacks.push(
      "There is room for improvement in some areas. Focus on subjects where you can enhance your scores to reach the next level."
    );
  } else if (overallPercentage >= 60) {
    feedbacks.push(
      "Satisfactory performance with steady progress. You have a good foundation in most subjects."
    );
    feedbacks.push(
      "To improve further, consider dedicating more time to challenging subjects and seeking additional help when needed."
    );
  } else {
    feedbacks.push(
      "Your performance shows potential for improvement. It's important to focus on understanding core concepts and regular practice."
    );
    feedbacks.push(
      "We encourage you to seek additional support, attend extra classes, and maintain consistent study habits to improve your academic performance."
    );
  }
  
  return feedbacks;
};

const generateReportCardController = async (req, res) => {
  try {
    const { studentId, class: classNum } = req.query;
    
    if (!studentId || !classNum) {
      return ApiResponse.badRequest("Student ID and Class are required").send(res);
    }

    // Fetch student details
    const student = await studentDetails.findById(studentId).select("-password -__v");
    if (!student) {
      return ApiResponse.notFound("Student not found").send(res);
    }

    // Fetch all subjects for the class
    const subjects = await Subject.find({ class: Number(classNum) });
    if (!subjects || subjects.length === 0) {
      return ApiResponse.notFound("No subjects found for this class").send(res);
    }

    // Fetch all exams for the class
    const exams = await Exam.find({ class: Number(classNum) });
    
    // Fetch all marks for the student
    const marks = await Marks.find({
      studentId: studentId,
      class: Number(classNum),
    })
      .populate("subjectId", "name")
      .populate("examId", "name examType totalMarks startDate");

    // Organize marks by subject and exam type (mid/end)
    const marksBySubject = {};
    
    subjects.forEach((subject) => {
      marksBySubject[subject._id.toString()] = {
        subjectName: subject.name,
        midSem: null,
        endSem: null,
      };
    });

    marks.forEach((mark) => {
      if (!mark.subjectId || !mark.examId) return;
      
      const subjectId = mark.subjectId._id.toString();
      if (marksBySubject[subjectId]) {
        const examType = mark.examId?.examType; // "mid" or "end"
        const examKey = examType === "mid" ? "midSem" : examType === "end" ? "endSem" : null;
        
        if (examKey) {
          // If no mark exists for this exam type, or if this exam is more recent, update it
          const existingMark = marksBySubject[subjectId][examKey];
          const examDate = mark.examId?.startDate || mark.examId?.createdAt || new Date();
          
          if (!existingMark) {
            marksBySubject[subjectId][examKey] = {
              marksObtained: mark.marksObtained,
              totalMarks: mark.examId?.totalMarks || 100,
              examName: mark.examId?.name || "",
              examDate: examDate,
            };
          } else {
            // If there's already a mark, keep the one with the more recent exam date
            const existingDate = existingMark.examDate || new Date(0);
            const currentDate = new Date(examDate);
            if (currentDate > existingDate) {
              marksBySubject[subjectId][examKey] = {
                marksObtained: mark.marksObtained,
                totalMarks: mark.examId?.totalMarks || 100,
                examName: mark.examId?.name || "",
                examDate: examDate,
              };
            }
          }
        }
      }
    });

    // Convert to array format
    const marksData = Object.values(marksBySubject);

    // Generate feedback
    const feedbacks = generateFeedback(marksData);

    // Create PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ReportCard_${student.enrollmentNo}_${student.firstName}_${student.lastName}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Colors
    const lightBlue = "#E6F3FF";
    const darkBlue = "#003366";
    const tealBlue = "#006699";

    // Header Section
    doc.rect(0, 0, 595, 120).fill(lightBlue);
    
    // Logo placeholder (you can add actual logo image here)
    doc.fontSize(20)
      .fillColor(darkBlue)
      .font("Helvetica-Bold")
      .text("REPORT CARD", 0, 30, { align: "center", width: 595 });
    
    doc.fontSize(14)
      .font("Helvetica")
      .text("Kendriya Vidyalaya", 0, 60, { align: "center", width: 595 });

    // Student Information Section
    let yPos = 140;
    doc.fontSize(12)
      .fillColor(darkBlue)
      .font("Helvetica-Bold")
      .text("Student :", 50, yPos)
      .font("Helvetica")
      .text(`${student.firstName} ${student.middleName} ${student.lastName}`, 150, yPos);
    
    yPos += 25;
    doc.font("Helvetica-Bold")
      .text("Level :", 50, yPos)
      .font("Helvetica")
      .text(`Class ${student.class}`, 150, yPos);
    
    yPos += 25;
    doc.font("Helvetica-Bold")
      .text("Enrollment No. :", 50, yPos)
      .font("Helvetica")
      .text(student.enrollmentNo.toString(), 150, yPos);

    // Grades Table Section
    yPos += 40;
    const tableTop = yPos;
    const tableLeft = 50;
    const tableWidth = 495; // Adjusted for 2 columns
    const rowHeight = 30;
    const headerHeight = 35;

    // Table Header
    doc.rect(tableLeft, tableTop, tableWidth, headerHeight).fill(tealBlue);
    doc.fontSize(11)
      .fillColor("white")
      .font("Helvetica-Bold")
      .text("Subject", tableLeft + 10, tableTop + 10)
      .text("Mid Sem", tableLeft + 250, tableTop + 10)
      .text("End Sem", tableLeft + 370, tableTop + 10);

    // Table Rows
    let currentY = tableTop + headerHeight;
    marksData.forEach((subject, index) => {
      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill("#F5F5F5");
      }
      
      // Draw borders
      doc.rect(tableLeft, currentY, tableWidth, rowHeight).stroke();
      
      // Subject name
      doc.fontSize(10)
        .fillColor(darkBlue)
        .font("Helvetica")
        .text(subject.subjectName, tableLeft + 10, currentY + 8, { width: 230 });
      
      // Exam grades (Mid Sem and End Sem)
      const exams = [
        { data: subject.midSem, xPos: tableLeft + 250 },
        { data: subject.endSem, xPos: tableLeft + 370 }
      ];
      
      exams.forEach((exam) => {
        if (exam.data && exam.data.marksObtained !== undefined) {
          const gradeInfo = calculateGrade(exam.data.marksObtained, exam.data.totalMarks);
          doc.text(gradeInfo.grade, exam.xPos + 10, currentY + 8);
        } else {
          doc.text("-", exam.xPos + 10, currentY + 8);
        }
      });
      
      currentY += rowHeight;
    });

    // Grading Scale Section
    yPos = currentY + 20;
    doc.rect(0, yPos - 10, 595, 40).fill(lightBlue);
    doc.fontSize(11)
      .fillColor(darkBlue)
      .font("Helvetica-Bold")
      .text("GRADING SCALE :", 50, yPos)
      .font("Helvetica")
      .text("A = 90%-100%  B = 80%-89%  C = 60%-79%  D = 0%-59%", 50, yPos + 20);

    // Comment Section
    yPos += 60;
    doc.fontSize(11)
      .fillColor(darkBlue)
      .font("Helvetica-Bold")
      .text("Comment :", 50, yPos);
    
    yPos += 25;
    const commentBoxHeight = 100;
    doc.rect(50, yPos, 495, commentBoxHeight).stroke();
    
    // Add feedback comments
    let commentY = yPos + 10;
    feedbacks.forEach((feedback) => {
      doc.fontSize(10)
        .fillColor("#333333")
        .font("Helvetica")
        .text(feedback, 60, commentY, {
          width: 475,
          align: "left",
        });
      commentY += 30;
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Generate Report Card Error: ", error);
    return ApiResponse.internalServerError().send(res);
  }
};

module.exports = {
  generateReportCardController,
};

