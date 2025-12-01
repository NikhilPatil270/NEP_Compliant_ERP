import React, { useEffect, useState } from "react";
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
    startDate: "",
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

  useEffect(() => {
    getExamsHandler();
  }, []);

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
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate image file type
      const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(selectedFile.type)) {
        toast.error("Please upload an image file (JPEG, PNG, GIF, or WebP)");
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const addExamHandler = async () => {
    if (
      !data.name ||
      !data.class ||
      !data.examType ||
      !data.totalMarks ||
      !data.startDate
    ) {
      toast.dismiss();
      toast.error("Please fill all the fields");
      return;
    }
    // Require file for new exams, but allow editing without new file if timetableLink exists
    if (!isEditing && !file) {
      toast.dismiss();
      toast.error("Please upload a timetable image");
      return;
    }
    if (isEditing && !file && !data.timetableLink) {
      toast.dismiss();
      toast.error("Please upload a timetable image");
      return;
    }
    try {
      setProcessLoading(true);
      toast.loading(isEditing ? "Updating Exam" : "Adding Exam");
      const headers = {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      };
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("class", data.class);
      formData.append("examType", data.examType);
      formData.append("totalMarks", data.totalMarks);
      formData.append("startDate", data.startDate);
      if (file) {
        formData.append("file", file);
      }
      const response = isEditing
        ? await axiosWrapper.patch(`/exam/${selectedExamId}`, formData, { headers })
        : await axiosWrapper.post(`/exam`, formData, { headers });
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
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setProcessLoading(false);
    }
  };

  const resetForm = () => {
    setData({
      name: "",
      startDate: "",
      class: "",
      examType: "mid",
      timetableLink: "",
      totalMarks: "",
    });
    setShowModal(false);
    setIsEditing(false);
    setSelectedExamId(null);
    setFile(null);
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
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().split("T")[0] : "",
    });
    setSelectedExamId(exam._id);
    setIsEditing(true);
    setShowModal(true);
    // Note: File cannot be preloaded in HTML file input for security reasons
    setFile(null);
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
                          {exam.startDate
                            ? `Starting Date: ${new Date(exam.startDate).toLocaleDateString()}`
                            : "Date not available"}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        Class {exam.class} · {exam.examType === "mid" ? "Mid Term" : "End Term"} · Total Marks: {exam.totalMarks}
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      {exam.timetableLink ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Exam Timetable:</p>
                          <div className="border rounded-md p-2 bg-gray-50">
                            <img
                              src={
                                exam.timetableLink &&
                                (exam.timetableLink.startsWith("http://") ||
                                  exam.timetableLink.startsWith("https://"))
                                  ? exam.timetableLink
                                  : `${process.env.REACT_APP_MEDIA_LINK}/${exam.timetableLink}`
                              }
                              alt={`${exam.name} Timetable`}
                              className="max-w-full h-auto rounded"
                              onClick={() => {
                                const url =
                                  exam.timetableLink &&
                                  (exam.timetableLink.startsWith("http://") ||
                                    exam.timetableLink.startsWith("https://"))
                                    ? exam.timetableLink
                                    : `${process.env.REACT_APP_MEDIA_LINK}/${exam.timetableLink}`;
                                window.open(url, "_blank");
                              }}
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">Click on the image to view in full size</p>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">Timetable not available.</div>
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
                        {item.startDate
                          ? new Date(item.startDate).toLocaleDateString()
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starting Date of Exam</label>
                  <input
                    type="date"
                    value={data.startDate}
                    onChange={(e) => setData({ ...data, startDate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Timetable {!isEditing && <span className="text-red-500">*</span>}
                  {isEditing && <span className="text-gray-500 text-xs font-normal ml-2">(Optional - leave empty to keep existing)</span>}
                </label>
                {isEditing && data.timetableLink && !file && (
                  <div className="mb-2 p-2 bg-gray-50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Current timetable:</p>
                    <img
                      src={
                        data.timetableLink &&
                        (data.timetableLink.startsWith("http://") ||
                          data.timetableLink.startsWith("https://"))
                          ? data.timetableLink
                          : `${process.env.REACT_APP_MEDIA_LINK}/${data.timetableLink}`
                      }
                      alt="Current timetable"
                      className="max-w-xs h-auto rounded border"
                    />
                  </div>
                )}
                <div className="flex items-center space-x-4">
                  <label className="flex-1 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
                    <span className="flex items-center justify-center">
                      <FiUpload className="mr-2" />
                      {file ? file.name : "Choose File"}
                    </span>
                    <input 
                      type="file" 
                      onChange={handleFileChange} 
                      accept="image/*"
                      className="hidden" 
                    />
                  </label>
                  {file && (
                    <CustomButton onClick={() => setFile(null)} variant="danger" className="!p-2">
                      <AiOutlineClose size={20} />
                    </CustomButton>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Please upload an image file (JPEG, PNG, GIF, or WebP)</p>
              </div>
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
