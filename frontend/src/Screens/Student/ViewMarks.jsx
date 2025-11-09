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

  useEffect(() => {
    const initialClass = userData?.class || 1;
    fetchSubjects(initialClass);
    fetchMarks(initialClass);
  }, []);

  const handleClassChange = (e) => {
    const classNum = e.target.value;
    setSelectedClass(classNum);
    fetchSubjects(classNum);
    fetchMarks(classNum);
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No end term marks available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewMarks;
