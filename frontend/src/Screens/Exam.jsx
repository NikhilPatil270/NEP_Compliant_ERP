import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { MdOutlineDelete, MdEdit } from "react-icons/md";
import { IoMdAdd } from "react-icons/io";
import { AiOutlineClose } from "react-icons/ai";
import axiosWrapper from "../utils/AxiosWrapper";
import Heading from "../components/Heading";
import DeleteConfirm from "../components/DeleteConfirm";
import CustomButton from "../components/CustomButton";
import { FiUpload } from "react-icons/fi";
import { useSelector } from "react-redux";
import Loading from "../components/Loading";

const Exam = () => {
  const [data, setData] = useState({
    name: "",
    date: "",
    class: "",
    examType: "mid",
    timetableLink: "",
    totalMarks: "",
  });
  const [exams, setExams] = useState();
  const [showModal, setShowModal] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [file, setFile] = useState(null);
  const userData = useSelector((state) => state.userData);
  const loginType = localStorage.getItem("userType");
  const [processLoading, setProcessLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [schedules, setSchedules] = useState({}); // { subjectId: { date, startTime, endTime, marks } }

  useEffect(() => {
    getExamsHandler();
  }, []);

  useEffect(() => {
    // load subjects whenever class changes in the modal
    if (showModal && data.class) {
      fetchSubjectsForClass(data.class);
    } else {
      setSubjects([]);
      setSelectedSubjectIds([]);
      setSchedules({});
    }
  }, [showModal, data.class]);

  const fetchSubjectsForClass = async (classNum) => {
    try {
      const response = await axiosWrapper.get(`/subject?class=${classNum}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (response.data.success) {
        setSubjects(response.data.data);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      setSubjects([]);
    }
  };

  const getExamsHandler = async () => {
    try {
      setDataLoading(true);
      let link = "/exam";
      if (userData.class) {
        link = `/exam?class=${userData.class}`;
      }
      const response = await axiosWrapper.get(link, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      if (response.data.success) {
        setExams(response.data.data);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setExams([]);
        return;
      }
      console.error(error);
      toast.error(error.response?.data?.message || "Error fetching exams");
    } finally {
      setDataLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const addExamHandler = async () => {
    if (
      !data.name ||
      !data.class ||
      !data.examType ||
      !data.totalMarks
    ) {
      toast.dismiss();
      toast.error("Please fill all the fields");
      return;
    }
    // when not uploading a file, require at least one subject with schedule inputs
    const isFileMode = !!file;
    let selectedSchedules = [];
    if (!isFileMode) {
      selectedSchedules = selectedSubjectIds
        .map((sid) => ({ sid, ...schedules[sid] }))
        .filter((s) => s && s.date && s.startTime && s.endTime && s.marks !== undefined && s.marks !== "")
        .map((s) => ({ subject: s.sid, date: s.date, startTime: s.startTime, endTime: s.endTime, marks: Number(s.marks) }));
      if (selectedSchedules.length === 0) {
        toast.dismiss();
        toast.error("Select subjects and assign date/time/marks for each subject");
        return;
      }
    }
    try {
      setProcessLoading(true);
      toast.loading(isEditing ? "Updating Exam" : "Adding Exam");
      let response;
      if (isFileMode) {
        const headers = {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        };
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("class", data.class);
        formData.append("examType", data.examType);
        formData.append("totalMarks", data.totalMarks);
        formData.append("file", file);
        response = isEditing
          ? await axiosWrapper.patch(`/exam/${selectedExamId}`, formData, { headers })
          : await axiosWrapper.post(`/exam`, formData, { headers });
      } else {
        const payload = {
          name: data.name,
          class: data.class,
          examType: data.examType,
          totalMarks: data.totalMarks,
          schedules: selectedSchedules,
        };
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        };
        response = isEditing
          ? await axiosWrapper.patch(`/exam/${selectedExamId}`, payload, { headers })
          : await axiosWrapper.post(`/exam`, payload, { headers });
      }
      toast.dismiss();
      if (response.data.success) {
        toast.success(response.data.message);
        resetForm();
        getExamsHandler();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response.data.message);
    } finally {
      setProcessLoading(false);
    }
  };

  const resetForm = () => {
    setData({
      name: "",
      class: "",
      examType: "mid",
      timetableLink: "",
      totalMarks: "",
    });
    setShowModal(false);
    setIsEditing(false);
    setSelectedExamId(null);
    setFile(null);
    setSubjects([]);
    setSelectedSubjectIds([]);
    setSchedules({});
  };

  const deleteExamHandler = async (id) => {
    setIsDeleteConfirmOpen(true);
    setSelectedExamId(id);
  };

  const editExamHandler = (exam) => {
    setData({
      name: exam.name,
      class: exam.class,
      examType: exam.examType,
      timetableLink: exam.timetableLink,
      totalMarks: exam.totalMarks,
    });
    setSelectedExamId(exam._id);
    setIsEditing(true);
    setShowModal(true);
    // preload schedules if present
    if (Array.isArray(exam.schedules) && exam.schedules.length > 0) {
      const ids = exam.schedules.map((s) => (typeof s.subject === "object" ? s.subject._id : s.subject));
      setSelectedSubjectIds(ids);
      const mapped = {};
      exam.schedules.forEach((s) => {
        const sid = typeof s.subject === "object" ? s.subject._id : s.subject;
        mapped[sid] = {
          date: s.date ? new Date(s.date).toISOString().split("T")[0] : "",
          startTime: s.startTime || "",
          endTime: s.endTime || "",
          marks: s.marks ?? "",
        };
      });
      setSchedules(mapped);
    }
  };

  const confirmDelete = async () => {
    try {
      toast.loading("Deleting Exam");
      const headers = {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      };
      const response = await axiosWrapper.delete(`/exam/${selectedExamId}`, {
        headers: headers,
      });
      toast.dismiss();
      if (response.data.success) {
        toast.success("Exam has been deleted successfully");
        setIsDeleteConfirmOpen(false);
        getExamsHandler();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response.data.message);
    }
  };

  return (
    <div className="w-full mx-auto mt-10 flex justify-center items-start flex-col mb-10">
      <div className="flex justify-between items-center w-full">
        <Heading title="Exam Details" />
        {!dataLoading && loginType !== "Student" && (
          <CustomButton onClick={() => setShowModal(true)}>
            <IoMdAdd className="text-2xl" />
          </CustomButton>
        )}
      </div>

      {!dataLoading ? (
        <div className="mt-8 w-full">
          {loginType === "Student" ? (
            <div className="space-y-6">
              {exams && exams.length > 0 ? (
                exams.map((exam, idx) => (
                  <div key={idx} className="bg-white border rounded-md">
                    <div className="px-6 py-4 border-b flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{exam.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {exam.startDate && exam.endDate
                            ? `${new Date(exam.startDate).toLocaleDateString()} - ${new Date(exam.endDate).toLocaleDateString()}`
                            : "Schedule not available"}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        Class {exam.class} · {exam.examType === "mid" ? "Mid Term" : "End Term"}
                      </div>
                    </div>
                    <div className="px-6 py-4 overflow-x-auto">
                      {exam.schedules && exam.schedules.length > 0 ? (
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="py-2 px-3 text-left">Subject</th>
                              <th className="py-2 px-3 text-left">Date</th>
                              <th className="py-2 px-3 text-left">Start</th>
                              <th className="py-2 px-3 text-left">End</th>
                              <th className="py-2 px-3 text-left">Marks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exam.schedules.map((s, i) => (
                              <tr key={i} className="border-b">
                                <td className="py-2 px-3">{s.subject?.name || "-"}</td>
                                <td className="py-2 px-3">{s.date ? new Date(s.date).toLocaleDateString() : "-"}</td>
                                <td className="py-2 px-3">{s.startTime || "-"}</td>
                                <td className="py-2 px-3">{s.endTime || "-"}</td>
                                <td className="py-2 px-3">{s.marks ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-sm text-gray-600">No schedule added.</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-base pt-10">No Exams found.</div>
              )}
            </div>
          ) : (
            <table className="text-sm min-w-full bg-white">
              <thead>
                <tr className="bg-blue-500 text-white">
                  <th className="py-4 px-6 text-left font-semibold">Exam Name</th>
                  <th className="py-4 px-6 text-left font-semibold">Date</th>
                  <th className="py-4 px-6 text-left font-semibold">Class</th>
                  <th className="py-4 px-6 text-left font-semibold">Exam Type</th>
                  <th className="py-4 px-6 text-left font-semibold">Total Marks</th>
                  <th className="py-4 px-6 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams && exams.length > 0 ? (
                  exams.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-blue-50">
                      <td className="py-4 px-6">{item.name}</td>
                      <td className="py-4 px-6">
                        {item.startDate && item.endDate
                          ? `${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`
                          : item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-4 px-6">{item.class}</td>
                      <td className="py-4 px-6">{item.examType === "mid" ? "Mid Term" : "End Term"}</td>
                      <td className="py-4 px-6">{item.totalMarks}</td>
                      <td className="py-4 px-6 text-center flex justify-center gap-4">
                        <CustomButton variant="secondary" className="!p-2" onClick={() => editExamHandler(item)}>
                          <MdEdit />
                        </CustomButton>
                        <CustomButton variant="danger" className="!p-2" onClick={() => deleteExamHandler(item._id)}>
                          <MdOutlineDelete />
                        </CustomButton>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-base pt-10">No Exams found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <Loading />
      )}

      {/* Add/Edit Exam Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {isEditing ? "Edit Exam" : "Add New Exam"}
              </h2>
              <CustomButton onClick={resetForm} variant="secondary">
                <AiOutlineClose size={24} />
              </CustomButton>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Name
                </label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    name="class"
                    value={data.class}
                    onChange={(e) => setData({ ...data, class: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
                  <select
                    value={data.examType}
                    onChange={(e) => setData({ ...data, examType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="mid">Mid Term</option>
                    <option value="end">End Term</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={data.totalMarks}
                    onChange={(e) => setData({ ...data, totalMarks: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Timetable (optional)</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex-1 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
                      <span className="flex items-center justify-center">
                        <FiUpload className="mr-2" />
                        {file ? file.name : "Choose File"}
                      </span>
                      <input type="file" onChange={handleFileChange} className="hidden" />
                    </label>
                    {file && (
                      <CustomButton onClick={() => setFile(null)} variant="danger" className="!p-2">
                        <AiOutlineClose size={20} />
                      </CustomButton>
                    )}
                  </div>
                </div>
              </div>

              {/* Subject multi-select and scheduling table */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Subjects</label>
                <select
                  multiple
                  value={selectedSubjectIds}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setSelectedSubjectIds(options);
                  }}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[140px]"
                >
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSubjectIds.length > 0 && (
                <div className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm bg-white">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="py-2 px-3 text-left">Subject</th>
                          <th className="py-2 px-3 text-left">Date</th>
                          <th className="py-2 px-3 text-left">Start Time</th>
                          <th className="py-2 px-3 text-left">End Time</th>
                          <th className="py-2 px-3 text-left">Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSubjectIds.map((sid) => {
                          const subj = subjects.find((s) => s._id === sid);
                          const row = schedules[sid] || { date: "", startTime: "", endTime: "", marks: "" };
                          return (
                            <tr key={sid} className="border-b">
                              <td className="py-2 px-3">{subj ? subj.name : sid}</td>
                              <td className="py-2 px-3">
                                <input
                                  type="date"
                                  value={row.date}
                                  onChange={(e) => setSchedules((prev) => ({ ...prev, [sid]: { ...prev[sid], date: e.target.value } }))}
                                  className="px-3 py-1 border rounded"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="time"
                                  value={row.startTime}
                                  onChange={(e) => setSchedules((prev) => ({ ...prev, [sid]: { ...prev[sid], startTime: e.target.value } }))}
                                  className="px-3 py-1 border rounded"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="time"
                                  value={row.endTime}
                                  onChange={(e) => setSchedules((prev) => ({ ...prev, [sid]: { ...prev[sid], endTime: e.target.value } }))}
                                  className="px-3 py-1 border rounded"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.marks}
                                  onChange={(e) => setSchedules((prev) => ({ ...prev, [sid]: { ...prev[sid], marks: e.target.value } }))}
                                  className="px-3 py-1 border rounded w-24"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-4 mt-6">
                <CustomButton onClick={resetForm} variant="secondary">
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={addExamHandler}
                  disabled={processLoading}
                >
                  {isEditing ? "Update Exam" : "Add Exam"}
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this exam?"
      />
    </div>
  );
};

export default Exam;
