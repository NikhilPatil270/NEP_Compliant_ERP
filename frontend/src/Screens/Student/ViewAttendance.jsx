import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import axiosWrapper from "../../utils/AxiosWrapper";
import Heading from "../../components/Heading";
import { useSelector } from "react-redux";

const ViewAttendance = () => {
  const userData = useSelector((state) => state.userData);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState(
    userData?.class || 1
  );
  const [attendance, setAttendance] = useState([]);
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

  const fetchAttendance = async (classNum) => {
    setDataLoading(true);
    toast.loading("Loading attendance...");
    try {
      const response = await axiosWrapper.get(
        `/attendance/student?class=${classNum}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        setAttendance(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching attendance");
    } finally {
      setDataLoading(false);
      toast.dismiss();
    }
  };

  useEffect(() => {
    const initialClass = userData?.class || 1;
    fetchSubjects(initialClass);
    fetchAttendance(initialClass);
  }, []);

  const handleClassChange = (e) => {
    const classNum = e.target.value;
    setSelectedClass(classNum);
    fetchSubjects(classNum);
    fetchAttendance(classNum);
  };

  const getSubjectAttendance = (subjectId) =>
    attendance.find((a) => a.subjectId?._id === subjectId);

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getAttendanceBgColor = (percentage) => {
    if (percentage >= 75) return "bg-green-50 border-green-200";
    if (percentage >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
      <div className="flex justify-between items-center w-full mb-6">
        <Heading title="View Attendance" />
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

      {dataLoading ? (
        <div className="w-full flex justify-center items-center py-10">
          <p className="text-gray-500">Loading attendance...</p>
        </div>
      ) : subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {subjects.map((subject) => {
            const attendanceRecord = getSubjectAttendance(subject._id);
            const classesAttended = attendanceRecord?.classesAttended || 0;
            const totalClasses = attendanceRecord?.totalClasses || 0;
            const percentage = attendanceRecord
              ? Number(attendanceRecord.attendancePercentage) || 0
              : 0;

            return (
              <div
                key={subject._id}
                className={`border rounded-lg p-6 hover:shadow-lg transition-shadow ${getAttendanceBgColor(
                  percentage
                )}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-gray-800 text-lg">
                      {subject.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Code: {subject.code}
                    </p>
                  </div>
                  <div
                    className={`text-2xl font-bold ${getAttendanceColor(
                      percentage
                    )}`}
                  >
                    {percentage.toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Classes Attended:
                    </span>
                    <span className="font-medium text-gray-800">
                      {classesAttended}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Total Classes:
                    </span>
                    <span className="font-medium text-gray-800">
                      {totalClasses}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Classes Absent:
                    </span>
                    <span className="font-medium text-gray-800">
                      {totalClasses - classesAttended}
                    </span>
                  </div>
                </div>

                {totalClasses > 0 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          percentage >= 75
                            ? "bg-green-500"
                            : percentage >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {!attendanceRecord && (
                  <p className="text-sm text-gray-400 mt-2 italic">
                    Attendance not yet recorded
                  </p>
                )}

                {percentage > 0 && percentage < 75 && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ Attendance below 75%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full flex justify-center items-center py-10">
          <p className="text-gray-500">No subjects found for this class</p>
        </div>
      )}

      {attendance.length === 0 && !dataLoading && subjects.length > 0 && (
        <div className="w-full mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-center">
            No attendance records found for this class. Please contact your
            faculty.
          </p>
        </div>
      )}
    </div>
  );
};

export default ViewAttendance;

