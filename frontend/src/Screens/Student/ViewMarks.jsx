import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import axiosWrapper from "../../utils/AxiosWrapper";
import Heading from "../../components/Heading";
import { useSelector } from "react-redux";

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

  const midTermMarks = marks.filter((mark) => mark.examId.examType === "mid");
  const endTermMarks = marks.filter((mark) => mark.examId.examType === "end");

  const getSubjectMark = (marksArray, subjectId) =>
    marksArray.find((m) => m.subjectId?._id === subjectId);

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
        <div>
          <Heading title="View Feedback" />
          <h1 className="mt-5">TO BE DONE</h1>
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
