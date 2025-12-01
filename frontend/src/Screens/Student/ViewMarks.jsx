import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import axiosWrapper from "../../utils/AxiosWrapper";
import Heading from "../../components/Heading";
import { useSelector } from "react-redux";
import { FaFileDownload } from "react-icons/fa";
import CustomButton from "../../components/CustomButton";

const COMPETENCY_LABELS = {
  understandingOfConcepts: "Concept Mastery",
  applicationReasoning: "Application & Reasoning",
  communication: "Communication",
  participationEffortAttitude: "Participation & Attitude",
};

const ViewMarks = () => {
  const userData = useSelector((state) => state.userData);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState(
    userData?.class || 1
  );
  const [marks, setMarks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [cbaScores, setCbaScores] = useState([]);
  const [showCBAModal, setShowCBAModal] = useState(false);
  const [selectedCBAData, setSelectedCBAData] = useState(null);
  const userToken = localStorage.getItem("userToken");

  const fetchSubjects = async (classNum) => {
    try {
      const response = await axiosWrapper.get(`/subject?class=${classNum}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.data.success) {
        setSubjects(response.data.data);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setSubjects([]);
        return;
      }
      toast.error(error.response?.data?.message || "Error fetching subjects");
    }
  };

  const fetchMarks = async (classNum) => {
    setDataLoading(true);
    toast.loading("Loading marks...");
    try {
      const response = await axiosWrapper.get(
        `/marks/student?class=${classNum}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        setMarks(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching marks");
    } finally {
      setDataLoading(false);
      toast.dismiss();
    }
  };

  const fetchCBAScores = async (classNum) => {
    try {
      const response = await axiosWrapper.get(
        `/cba/student?class=${classNum}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        setCbaScores(response.data.data);
      }
    } catch (error) {
      // Silently fail if CBA scores don't exist
      setCbaScores([]);
    }
  };

  useEffect(() => {
    const initialClass = userData?.class || 1;
    fetchSubjects(initialClass);
    fetchMarks(initialClass);
    fetchCBAScores(initialClass);
  }, []);

  const handleClassChange = (e) => {
    const classNum = e.target.value;
    setSelectedClass(classNum);
    fetchSubjects(classNum);
    fetchMarks(classNum);
    fetchCBAScores(classNum);
  };

  const getCBAScore = (subjectId, examType) => {
    return cbaScores.find(
      (cba) =>
        cba.subjectId?._id === subjectId &&
        cba.examId?.examType === examType
    );
  };

  const handleViewCBA = (subjectId, examType) => {
    const cbaScore = getCBAScore(subjectId, examType);
    if (cbaScore) {
      setSelectedCBAData(cbaScore);
      setShowCBAModal(true);
    } else {
      toast.error("CBA score not available for this subject and exam");
    }
  };

  const feedbackData = useMemo(() => {
    if (!marks || marks.length === 0) {
      return null;
    }

    const findCBA = (subjectId, examType) =>
      cbaScores.find(
        (cba) =>
          cba.subjectId?._id === subjectId && cba.examId?.examType === examType
      );

    const subjectMap = marks.reduce((acc, mark) => {
      const subjectId = mark.subjectId?._id;
      if (!subjectId) return acc;

      if (!acc[subjectId]) {
        acc[subjectId] = {
          id: subjectId,
          name: mark.subjectId?.name || "Subject",
          totalObtained: 0,
          totalPossible: 0,
          exams: [],
          cbaFlags: [],
        };
      }

      acc[subjectId].totalObtained += mark.marksObtained || 0;
      acc[subjectId].totalPossible += mark.examId?.totalMarks || 0;

      const cbaScore = findCBA(subjectId, mark.examId?.examType);
      let cbaHighlights = [];
      if (cbaScore?.competencies) {
        cbaHighlights = Object.entries(cbaScore.competencies)
          .filter(([, value]) => value && value !== "Meets Expectations")
          .map(([key, value]) => {
            const readableKey =
              COMPETENCY_LABELS[key] || key.replace(/([A-Z])/g, " $1");
            return `${readableKey}: ${value}`;
          });
      }

      acc[subjectId].cbaFlags.push(...cbaHighlights);
      acc[subjectId].exams.push({
        examName: mark.examId?.name || "Exam",
        examType: mark.examId?.examType,
        score: mark.marksObtained || 0,
        total: mark.examId?.totalMarks || 0,
        cbaScore,
        cbaHighlights,
      });

      return acc;
    }, {});

    const subjectSummaries = Object.values(subjectMap)
      .map((subject) => {
        const percentage =
          subject.totalPossible > 0
            ? (subject.totalObtained / subject.totalPossible) * 100
            : 0;

        const performanceTag =
          percentage >= 85
            ? "Excellent"
            : percentage >= 70
            ? "Steady"
            : percentage >= 55
            ? "Needs Push"
            : "Priority";

        const action =
          percentage >= 85
            ? "Keep stretching with enrichment worksheets."
            : percentage >= 70
            ? "Strengthen tricky concepts to reach excellence."
            : percentage >= 55
            ? "Revise fundamentals and solve extra practice sets."
            : "Schedule remedial time to rebuild foundational skills.";

        const cbaHighlights = Array.from(new Set(subject.cbaFlags));

        return {
          ...subject,
          percentage,
          performanceTag,
          action,
          cbaHighlights,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const strongAreas = subjectSummaries.filter(
      (subject) => subject.percentage >= 80
    );
    const weakAreas = subjectSummaries.filter(
      (subject) => subject.percentage < 60
    );

    const strongNames = strongAreas.map((subject) => subject.name);
    const weakNames = weakAreas.map((subject) => subject.name);

    const generalPlan = [
      strongNames.length
        ? `Maintain focus on ${strongNames.join(", ")} to keep your edge.`
        : "Build daily practice momentum to establish strong subjects.",
      weakNames.length
        ? `Dedicate a 30-minute daily slot to ${weakNames.join(", ")}.`
        : "Continue your daily revision rhythm and timed practice.",
      "Revise the core concepts before each upcoming assessment.",
    ];

    const specificTips =
      weakAreas.length > 0
        ? weakAreas.map(
            (subject) =>
              `${subject.name}: ${subject.action} Target ${
                Math.round(subject.percentage + 10) || 10
              }% next term.`
          )
        : [
            "Experiment with higher-order questions across subjects to stay ahead.",
          ];

    return {
      subjectSummaries,
      strongAreas,
      weakAreas,
      generalPlan,
      specificTips,
    };
  }, [marks, cbaScores]);

  const midTermMarks = marks.filter((mark) => mark.examId.examType === "mid");
  const endTermMarks = marks.filter((mark) => mark.examId.examType === "end");

  const getSubjectMark = (marksArray, subjectId) =>
    marksArray.find((m) => m.subjectId?._id === subjectId);

  const hasFeedback =
    feedbackData && feedbackData.subjectSummaries.length > 0;

  const downloadReportCard = async () => {
    try {
      if (!userData?._id || !selectedClass) {
        toast.error("Student information not available");
        return;
      }
      
      toast.loading("Generating report card...");
      const response = await axiosWrapper.get(
        `/student/report-card?studentId=${userData._id}&class=${selectedClass}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
          responseType: "blob",
        }
      );

      toast.dismiss();
      
      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ReportCard_${userData.enrollmentNo}_${userData.firstName}_${userData.lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Report card downloaded successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error generating report card");
    }
  };

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
      <div className="flex justify-between items-center w-full mb-6">
        <Heading title="View Marks" />
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Class:</label>
          <select
            value={selectedClass || ""}
            onChange={handleClassChange}
            className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[1, 2, 3, 4, 5].map((classNum) => (
              <option key={classNum} value={classNum}>
                Class {classNum}
              </option>
            ))}
          </select>
          <CustomButton
            variant="primary"
            onClick={downloadReportCard}
            className="flex items-center gap-2"
            title="Download Report Card"
          >
            <FaFileDownload />
            <span>Download Report Card</span>
          </CustomButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Mid Term Marks</h2>
          {dataLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : subjects.length > 0 ? (
            <div className="space-y-4">
              {subjects.map((subject) => {
                const mark = getSubjectMark(midTermMarks, subject._id);
                return (
                  <div
                    key={subject._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{subject.name}</p>
                        <p className="text-sm text-gray-500">
                          {mark ? mark.examId.name : "Mid Term"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${mark ? "text-blue-600" : "text-gray-400"}`}>
                            {mark ? mark.marksObtained : "to be updated"}
                          </p>
                          {mark && (
                            <p className="text-sm text-gray-500">
                              out of {mark.examId.totalMarks}
                            </p>
                          )}
                        </div>
                        {getCBAScore(subject._id, "mid") && (
                          <button
                            onClick={() => handleViewCBA(subject._id, "mid")}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
                          >
                            CBA Score
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No mid term marks available</p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">End Term Marks</h2>
          {dataLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : subjects.length > 0 ? (
            <div className="space-y-4">
              {subjects.map((subject) => {
                const mark = getSubjectMark(endTermMarks, subject._id);
                return (
                  <div
                    key={subject._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{subject.name}</p>
                        <p className="text-sm text-gray-500">
                          {mark ? mark.examId.name : "End Term"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${mark ? "text-blue-600" : "text-gray-400"}`}>
                            {mark ? mark.marksObtained : "to be updated"}
                          </p>
                          {mark && (
                            <p className="text-sm text-gray-500">
                              out of {mark.examId.totalMarks}
                            </p>
                          )}
                        </div>
                        {getCBAScore(subject._id, "end") && (
                          <button
                            onClick={() => handleViewCBA(subject._id, "end")}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
                          >
                            CBA Score
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No end term marks available</p>
          )}
        </div>
        <div className="col-span-1 md:col-span-2">
          <div className="bg-gradient-to-b from-blue-50 to-white rounded-2xl shadow-sm p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <Heading title="View Feedback" />
              {hasFeedback && (
                <p className="text-xs md:text-sm text-gray-500">
                  Updated on {new Date().toLocaleDateString()}
                </p>
              )}
            </div>

            {!hasFeedback ? (
              <p className="text-gray-600">
                Feedback will appear here once your marks and CBA scores are
                published.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span role="img" aria-label="strength" className="text-xl">
                        💪
                      </span>
                      <h3 className="text-lg font-semibold text-blue-700">
                        Strong Areas
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      You demonstrate a strong grasp in these subjects:
                    </p>
                    <ul className="space-y-3">
                      {feedbackData.strongAreas.length > 0 ? (
                        feedbackData.strongAreas.map((subject) => (
                          <li
                            key={subject.id}
                            className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-lg px-4 py-3"
                          >
                            <div>
                              <p className="font-semibold text-gray-800">
                                {subject.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                Avg Score: {subject.percentage.toFixed(1)}%
                              </p>
                            </div>
                            <span className="text-sm font-medium text-blue-600">
                              Maintain focus
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500">
                          Keep practicing to unlock strong areas.
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span role="img" aria-label="weakness" className="text-xl">
                        ⚠️
                      </span>
                      <h3 className="text-lg font-semibold text-blue-700">
                        Priority Areas
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      These subjects require immediate attention:
                    </p>
                    <ul className="space-y-3">
                      {feedbackData.weakAreas.length > 0 ? (
                        feedbackData.weakAreas.map((subject) => (
                          <li
                            key={subject.id}
                            className="flex justify-between items-center bg-red-50 border border-red-100 rounded-lg px-4 py-3"
                          >
                            <div>
                              <p className="font-semibold text-gray-800">
                                {subject.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                Avg Score: {subject.percentage.toFixed(1)}%
                              </p>
                            </div>
                            <span className="text-sm font-medium text-red-600">
                              Dedicate more time
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500">
                          No priority areas detected. Keep up the good work!
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 bg-white border border-blue-100 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span role="img" aria-label="plan" className="text-xl">
                      📝
                    </span>
                    <h3 className="text-lg font-semibold text-blue-700">
                      Suggested Action Plan & Improvement Tips
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    The following tips are generated based on your current marks
                    and CBA competencies.
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">
                        General Action Plan
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
                        {feedbackData.generalPlan.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">
                        Specific Subject Improvement Tips
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
                        {feedbackData.specificTips.map((tip, index) => (
                          <li key={index}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-md font-semibold text-gray-800">
                    Subject-wise Insights (Marks + CBA)
                  </h4>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feedbackData.subjectSummaries.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-white border border-blue-100 rounded-xl p-5 shadow-sm flex flex-col gap-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {subject.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Average Score: {subject.percentage.toFixed(1)}%
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              subject.performanceTag === "Excellent"
                                ? "bg-blue-100 text-blue-700"
                                : subject.performanceTag === "Steady"
                                ? "bg-sky-100 text-sky-700"
                                : subject.performanceTag === "Needs Push"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {subject.performanceTag}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {subject.exams.map((exam, index) => (
                            <div
                              key={`${subject.id}-${exam.examType}-${index}`}
                              className="flex items-center justify-between text-sm bg-blue-50 rounded-lg px-3 py-2"
                            >
                              <div>
                                <p className="font-medium text-gray-800">
                                  {exam.examName}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {exam.examType} term
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-blue-700">
                                  {exam.score}/{exam.total}
                                </p>
                                {exam.cbaScore && (
                                  <p className="text-[11px] text-gray-500">
                                    CBA saved
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {subject.cbaHighlights.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-800 mb-2">
                              CBA Focus Areas
                            </p>
                            <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
                              {subject.cbaHighlights.map((highlight, index) => (
                                <li key={index}>{highlight}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-sm text-blue-700 font-medium">
                          Next Step: {subject.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CBA Score Modal */}
      {showCBAModal && selectedCBAData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                CBA Score - {selectedCBAData.subjectId?.name}
              </h2>
              <button
                onClick={() => {
                  setShowCBAModal(false);
                  setSelectedCBAData(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Subject:</strong> {selectedCBAData.subjectId?.name} |{" "}
                <strong>Exam:</strong> {selectedCBAData.examId?.name} |{" "}
                <strong>Class:</strong> {selectedCBAData.class}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                COMMON RUBRIC FOR ALL SUBJECTS
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left font-semibold">
                        Competency
                      </th>
                      <th className="border border-gray-300 p-3 text-center font-semibold">
                        Assessment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">
                        Understanding of Concepts / Skills
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedCBAData.competencies.understandingOfConcepts ===
                            "Meets Expectations"
                              ? "bg-green-100 text-green-800"
                              : selectedCBAData.competencies.understandingOfConcepts ===
                                "Approaching Expectations"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedCBAData.competencies.understandingOfConcepts}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">
                        Application / Reasoning
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedCBAData.competencies.applicationReasoning ===
                            "Meets Expectations"
                              ? "bg-green-100 text-green-800"
                              : selectedCBAData.competencies.applicationReasoning ===
                                "Approaching Expectations"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedCBAData.competencies.applicationReasoning}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">
                        Communication
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedCBAData.competencies.communication ===
                            "Meets Expectations"
                              ? "bg-green-100 text-green-800"
                              : selectedCBAData.competencies.communication ===
                                "Approaching Expectations"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedCBAData.competencies.communication}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3 font-medium">
                        Participation, Effort & Attitude
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedCBAData.competencies.participationEffortAttitude ===
                            "Meets Expectations"
                              ? "bg-green-100 text-green-800"
                              : selectedCBAData.competencies.participationEffortAttitude ===
                                "Approaching Expectations"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedCBAData.competencies.participationEffortAttitude}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowCBAModal(false);
                  setSelectedCBAData(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewMarks;
