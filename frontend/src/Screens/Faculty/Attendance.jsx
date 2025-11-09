import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import axiosWrapper from "../../utils/AxiosWrapper";
import Heading from "../../components/Heading";
import CustomButton from "../../components/CustomButton";

const Attendance = () => {
  const [branches, setBranches] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const userToken = localStorage.getItem("userToken");
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [masterAttendanceData, setMasterAttendanceData] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [totalClasses, setTotalClasses] = useState(0);
  const [showTotalClassesInput, setShowTotalClassesInput] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showSearch, setShowSearch] = useState(true);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "branch") {
      const branch = branches.find((b) => b._id === value);
      setSelectedBranch(branch);
    } else if (name === "subject") {
      const subject = subjects.find((s) => s._id === value);
      setSelectedSubject(subject);
    } else if (name === "class") {
      setSelectedClass(value);
    }
  };

  const fetchBranches = async () => {
    try {
      toast.loading("Loading branches...");
      const response = await axiosWrapper.get("/branch", {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      if (response.data.success) {
        setBranches(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setBranches([]);
      } else {
        toast.error(error.response?.data?.message || "Failed to load branches");
      }
    } finally {
      toast.dismiss();
    }
  };

  const fetchSubjects = async () => {
    try {
      toast.loading("Loading subjects...");
      const response = await axiosWrapper.get(
        `/subject?branch=${selectedBranch?._id}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );
      if (response.data.success) {
        setSubjects(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setSubjects([]);
      } else {
        toast.error(error.response?.data?.message || "Failed to load subjects");
      }
    } finally {
      toast.dismiss();
    }
  };

  const fetchTotalClasses = async () => {
    if (!selectedSubject || !selectedClass) return 0;

    try {
      const response = await axiosWrapper.get(
        `/attendance/total-classes?subjectId=${selectedSubject._id}&class=${selectedClass}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        const fetchedTotalClasses = response.data.data.totalClasses || 0;
        setTotalClasses(fetchedTotalClasses);
        if (fetchedTotalClasses === 0) {
          setShowTotalClassesInput(true);
        } else {
          setShowTotalClassesInput(false);
        }
        return fetchedTotalClasses;
      }
      return 0;
    } catch (error) {
      console.error("Error fetching total classes:", error);
      setTotalClasses(0);
      setShowTotalClassesInput(true);
      return 0;
    }
  };

  const setTotalClassesHandler = async () => {
    const totalClassesValue = Number(totalClasses);
    if (!totalClassesValue || totalClassesValue <= 0) {
      toast.error("Please enter a valid number of total classes");
      return;
    }

    setDataLoading(true);
    toast.loading("Setting total classes...");
    try {
      const response = await axiosWrapper.post(
        "/attendance/total-classes",
        {
          subjectId: selectedSubject._id,
          class: selectedClass,
          totalClasses: totalClassesValue,
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        toast.success("Total classes set successfully!");
        setTotalClasses(totalClassesValue);
        setShowTotalClassesInput(false);
        // After setting total classes, fetch students with the new total classes value
        await searchStudents(totalClassesValue);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error setting total classes");
    } finally {
      setDataLoading(false);
      toast.dismiss();
    }
  };

  const searchStudents = async (totalClassesValue = null) => {
    const classesToUse = totalClassesValue || totalClasses;
    if (!classesToUse || classesToUse <= 0) {
      toast.error("Please set total classes first");
      return;
    }

    setDataLoading(true);
    toast.loading("Loading students...");
    setStudents([]);
    try {
      const response = await axiosWrapper.get(
        `/attendance/students?subject=${selectedSubject._id}&class=${selectedClass}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      toast.dismiss();
      if (response.data.success) {
        if (response.data.data.length === 0) {
          toast.error("No students found!");
          setStudents([]);
          setMasterAttendanceData([]);
        } else {
          toast.success("Students loaded!");
          setStudents(response.data.data);
          const initialAttendanceData = {};
          response.data.data.forEach((student) => {
            initialAttendanceData[student._id] = student.classesAttended || 0;
          });
          setAttendanceData(initialAttendanceData);
          setMasterAttendanceData(response.data.data);
          setShowSearch(false);
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error loading students");
      console.error("Search error:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!consent) {
      toast.error("Please confirm the consent before submitting");
      return;
    }

    // Validate that classes attended doesn't exceed total classes
    const invalidEntries = Object.entries(attendanceData).filter(
      ([studentId, classesAttended]) =>
        Number(classesAttended) > totalClasses || Number(classesAttended) < 0
    );

    if (invalidEntries.length > 0) {
      toast.error(
        `Classes attended cannot exceed ${totalClasses} or be negative. Please check your entries.`
      );
      return;
    }

    setDataLoading(true);
    toast.loading("Submitting attendance...");
    try {
      const attendanceToSubmit = Object.entries(attendanceData).map(
        ([studentId, classesAttended]) => ({
          studentId,
          classesAttended: Number(classesAttended),
        })
      );

      const response = await axiosWrapper.post(
        "/attendance/bulk",
        {
          attendance: attendanceToSubmit,
          subjectId: selectedSubject._id,
          class: selectedClass,
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      if (response.data.success) {
        toast.success("Attendance submitted successfully!");
        setAttendanceData({});
        setConsent(false);
        setShowSearch(true);
        setMasterAttendanceData([]);
        setStudents([]);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error submitting attendance");
      console.error("Submit error:", error);
    } finally {
      setDataLoading(false);
      toast.dismiss();
    }
  };

  const handleBack = () => {
    setShowSearch(true);
    setStudents([]);
    setMasterAttendanceData([]);
    setAttendanceData({});
    setConsent(false);
  };

  const handleSearch = async () => {
    const fetchedTotalClasses = await fetchTotalClasses();
    if (fetchedTotalClasses > 0) {
      await searchStudents();
    } else {
      toast.error("Please set total classes first");
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [userToken]);

  useEffect(() => {
    if (selectedBranch) {
      fetchSubjects();
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedSubject && selectedClass) {
      fetchTotalClasses();
    }
  }, [selectedSubject, selectedClass]);

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
      <div className="flex justify-between items-center w-full">
        <Heading title="Attendance Management" />
      </div>

      {showSearch && (
        <div className="w-full bg-white rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-[90%] mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <select
                name="class"
                value={selectedClass || ""}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
                {[1, 2, 3, 4, 5].map((classNum) => (
                  <option key={classNum} value={classNum}>
                    Class {classNum}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                name="branch"
                value={selectedBranch?._id || ""}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Branch</option>
                {branches?.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                name="subject"
                value={selectedSubject?._id || ""}
                onChange={handleInputChange}
                disabled={!selectedBranch}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !selectedBranch ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              >
                <option value="">Select Subject</option>
                {subjects?.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {!selectedBranch && (
                <p className="text-xs text-gray-500 mt-1">
                  Please select a branch first
                </p>
              )}
            </div>
          </div>

          {/* Total Classes Input Section */}
          {selectedSubject && selectedClass && (
            <div className="mt-6 w-[90%] mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Classes Conducted
                  {totalClasses > 0 && (
                    <span className="text-green-600 ml-2">
                      (Currently: {totalClasses})
                    </span>
                  )}
                </label>
                {showTotalClassesInput || totalClasses === 0 ? (
                  <div className="flex gap-4">
                    <input
                      type="number"
                      min="1"
                      value={totalClasses}
                      onChange={(e) => setTotalClasses(e.target.value)}
                      placeholder="Enter total classes"
                      className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <CustomButton
                      variant="primary"
                      onClick={setTotalClassesHandler}
                      disabled={dataLoading || !totalClasses || totalClasses <= 0}
                    >
                      {dataLoading ? "Setting..." : "Set Total Classes"}
                    </CustomButton>
                    {totalClasses > 0 && (
                      <CustomButton
                        variant="secondary"
                        onClick={() => {
                          setShowTotalClassesInput(true);
                        }}
                      >
                        Update
                      </CustomButton>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold text-gray-800">
                      {totalClasses} classes
                    </p>
                    <CustomButton
                      variant="secondary"
                      onClick={() => {
                        setShowTotalClassesInput(true);
                      }}
                    >
                      Update Total Classes
                    </CustomButton>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center w-[10%] mx-auto">
            <CustomButton
              type="submit"
              disabled={
                dataLoading ||
                !selectedBranch ||
                !selectedSubject ||
                !selectedClass ||
                totalClasses <= 0
              }
              variant="primary"
              onClick={handleSearch}
            >
              {dataLoading ? "Loading..." : "Load Students"}
            </CustomButton>
          </div>
        </div>
      )}

      {/* Attendance Entry Section */}
      {!showSearch && masterAttendanceData && masterAttendanceData.length > 0 && (
        <div className="w-full bg-white rounded-lg p-6">
          <div className="space-y-4 w-full mb-6">
            <div className="flex flex-col gap-4 w-[90%] mx-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="border p-3 rounded-md shadow">
                  <span className="text-sm text-gray-500">Class:</span>
                  <p className="text-gray-800">Class {selectedClass}</p>
                </div>

                <div className="border p-3 rounded-md shadow">
                  <span className="text-sm text-gray-500">Subject:</span>
                  <p className="text-gray-800">
                    {selectedSubject?.name || "Not Selected"}
                  </p>
                </div>

                <div className="border p-3 rounded-md shadow">
                  <span className="text-sm text-gray-500">Total Classes:</span>
                  <p className="text-gray-800">{totalClasses}</p>
                </div>
              </div>

              <div className="border p-3 rounded-md shadow">
                <span className="text-sm text-gray-500">Students:</span>
                <p className="text-gray-800">
                  {masterAttendanceData.length} students
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center mb-4">
            <CustomButton
              variant="secondary"
              onClick={handleBack}
              className="text-sm"
            >
              Back to Search
            </CustomButton>
          </div>

          <div className="grid grid-cols-4 gap-4 w-[100%] mx-auto">
            {masterAttendanceData.map((student) => {
              const classesAttended = attendanceData[student._id] || 0;
              const percentage =
                totalClasses > 0
                  ? ((classesAttended / totalClasses) * 100).toFixed(2)
                  : 0;
              return (
                <div
                  key={student._id}
                  className="flex flex-col items-center justify-between w-full border rounded-md p-3"
                >
                  <p className="font-medium text-gray-700 text-center mb-2">
                    {student.enrollmentNo}
                  </p>
                  <p className="text-xs text-gray-500 mb-1">
                    {student.firstName} {student.lastName}
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={totalClasses}
                    className="px-4 py-2 border rounded-md focus:outline-none bg-gray-50 border-gray-200 focus:ring-2 focus:ring-blue-500 w-full mb-2"
                    value={attendanceData[student._id] || ""}
                    placeholder="Classes Attended"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || (Number(value) >= 0 && Number(value) <= totalClasses)) {
                        setAttendanceData({
                          ...attendanceData,
                          [student._id]: value,
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    {percentage}% attendance
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-4 bottom-0 left-0 right-0 bg-white p-4 border-t mt-10">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="consent" className="text-sm text-gray-700">
                I confirm that all attendance data entered is correct and verified
              </label>
            </div>

            <CustomButton
              type="submit"
              disabled={dataLoading || !consent}
              variant="primary"
              onClick={handleSubmit}
            >
              {dataLoading ? "Submitting..." : "Submit Attendance"}
            </CustomButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;

