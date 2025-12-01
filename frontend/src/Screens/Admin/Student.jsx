import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { MdOutlineDelete, MdEdit } from "react-icons/md";
import { IoMdAdd, IoMdClose } from "react-icons/io";
import { FaFileDownload } from "react-icons/fa";
import Heading from "../../components/Heading";
import DeleteConfirm from "../../components/DeleteConfirm";
import axiosWrapper from "../../utils/AxiosWrapper";
import CustomButton from "../../components/CustomButton";
import NoData from "../../components/NoData";
import { CgDanger } from "react-icons/cg";
import { baseApiURL } from "../../baseUrl";

const Student = () => {
  const [searchParams, setSearchParams] = useState({
    enrollmentNo: "",
    name: "",
    class: "",
  });
  const [students, setStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [file, setFile] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const userToken = localStorage.getItem("userToken");

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    class: "",
    gender: "",
    dob: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "",
    profile: "",
    status: "active",
    bloodGroup: "",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
  });


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const searchStudents = async (e) => {
    e.preventDefault();

    if (
      !searchParams.enrollmentNo &&
      !searchParams.name &&
      !searchParams.class
    ) {
      toast.error("Please select at least one filter");
      return;
    }

    setDataLoading(true);
    setHasSearched(true);
    toast.loading("Searching students...");
    try {
      const response = await axiosWrapper.post(
        `/student/search`,
        searchParams,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      toast.dismiss();
      if (response.data.success) {
        if (response.data.data.length === 0) {
          setStudents([]);
        } else {
          toast.success("Students found!");
          setStudents(response.data.data);
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      setStudents([]);
      toast.error(error.response?.data?.message || "Error searching students");
    } finally {
      setDataLoading(false);
    }
  };

  const handleFormInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmergencyContactChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));
  };

  const addStudentHandler = async () => {
    try {
      toast.loading(isEditing ? "Updating Student" : "Adding Student");
      const headers = {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${userToken}`,
      };

      const formDataToSend = new FormData();
      for (const key in formData) {
        if (key === "emergencyContact") {
          for (const subKey in formData.emergencyContact) {
            formDataToSend.append(
              `emergencyContact[${subKey}]`,
              formData.emergencyContact[subKey]
            );
          }
        } else {
          formDataToSend.append(key, formData[key]);
        }
      }

      if (file) {
        formDataToSend.append("file", file);
      }

      let response;
      if (isEditing) {
        response = await axiosWrapper.patch(
          `/student/${selectedStudentId}`,
          formDataToSend,
          {
            headers,
          }
        );
      } else {
        response = await axiosWrapper.post(
          `/student/register`,
          formDataToSend,
          {
            headers,
          }
        );
      }

      toast.dismiss();
      if (response.data.success) {
        if (!isEditing) {
          toast.success(
            `Student created successfully! Default password: student123`
          );
        } else {
          toast.success(response.data.message);
        }
        resetForm();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error");
    }
  };

  const deleteStudentHandler = (id) => {
    setIsDeleteConfirmOpen(true);
    setSelectedStudentId(id);
  };

  const downloadReportCard = async (student) => {
    try {
      toast.loading("Generating report card...");
      const response = await axiosWrapper.get(
        `/student/report-card?studentId=${student._id}&class=${student.class}`,
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
      link.download = `ReportCard_${student.enrollmentNo}_${student.firstName}_${student.lastName}.pdf`;
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

  const editStudentHandler = (student) => {
    setFormData({
      firstName: student.firstName || "",
      middleName: student.middleName || "",
      lastName: student.lastName || "",
      phone: student.phone || "",
      class: student.class || "",
      gender: student.gender || "",
      dob: student.dob?.split("T")[0] || "",
      address: student.address || "",
      city: student.city || "",
      state: student.state || "",
      pincode: student.pincode || "",
      country: student.country || "",
      profile: student.profile || "",
      status: student.status || "active",
      bloodGroup: student.bloodGroup || "",
      emergencyContact: {
        name: student.emergencyContact?.name || "",
        relationship: student.emergencyContact?.relationship || "",
        phone: student.emergencyContact?.phone || "",
      },
    });
    setSelectedStudentId(student._id);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const confirmDelete = async () => {
    try {
      toast.loading("Deleting Student");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      };
      const response = await axiosWrapper.delete(
        `/student/${selectedStudentId}`,
        {
          headers,
        }
      );
      toast.dismiss();
      if (response.data.success) {
        toast.success("Student has been deleted successfully");
        setIsDeleteConfirmOpen(false);
        searchStudents({ preventDefault: () => {} });
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Error");
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      phone: "",
      class: "",
      gender: "",
      dob: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      country: "",
      profile: "",
      status: "active",
      bloodGroup: "",
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
      },
    });
    setShowAddForm(false);
    setIsEditing(false);
    setSelectedStudentId(null);
    setFile(null);
  };

  return (
    <div className="w-full mx-auto mt-4 sm:mt-10 flex justify-center items-start flex-col mb-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
        <Heading title="Student Management" />
        <CustomButton onClick={() => setShowAddForm(true)} className="w-full sm:w-auto">
          <IoMdAdd className="text-2xl" />
        </CustomButton>
      </div>

      <div className="my-6 mx-auto w-full px-4">
          <form onSubmit={searchStudents} className="flex flex-col items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl mx-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enrollment Number
                </label>
                <input
                  type="text"
                  name="enrollmentNo"
                  value={searchParams.enrollmentNo}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter enrollment number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={searchParams.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter student name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  name="class"
                  value={searchParams.class}
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

            </div>

            <div className="mt-6 flex justify-center w-full sm:w-auto">
              <CustomButton
                type="submit"
                disabled={dataLoading}
                variant="primary"
                className="w-full sm:w-auto"
              >
                {dataLoading ? "Searching..." : "Search"}
              </CustomButton>
            </div>
          </form>

          {!hasSearched && (
            <div className="text-center mt-8 text-gray-600 flex flex-col items-center justify-center my-10 bg-white p-6 sm:p-10 rounded-lg mx-auto w-full sm:w-[90%] md:w-[70%] lg:w-[40%]">
              <img
                src="/assets/filter.svg"
                alt="Select filters"
                className="w-48 h-48 sm:w-64 sm:h-64 mb-4"
              />
              <p className="text-sm sm:text-base px-4">Please select at least one filter to search students</p>
            </div>
          )}

          {hasSearched && students.length === 0 && (
            <NoData title="No students found" />
          )}

          {students && students.length > 0 && (
            <div className="mt-6 sm:mt-8 w-full">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Search Results</h2>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 lg:px-6 py-3 border-b text-left text-sm">Profile</th>
                      <th className="px-4 lg:px-6 py-3 border-b text-left text-sm">Name</th>
                      <th className="px-4 lg:px-6 py-3 border-b text-left text-sm">E. No</th>
                      <th className="px-4 lg:px-6 py-3 border-b text-left text-sm">Class</th>
                      <th className="px-4 lg:px-6 py-3 border-b text-left text-sm">Email</th>
                      <th className="px-4 lg:px-6 py-3 border-b text-center text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 border-b">
                          <img
                            src={`${process.env.REACT_APP_MEDIA_LINK}/${student.profile}`}
                            alt={`${student.firstName}'s profile`}
                            className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-full"
                            onError={(e) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1744315900478-fa44dc6a4e89?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                            }}
                          />
                        </td>
                        <td className="px-4 lg:px-6 py-4 border-b text-sm">
                          {student.firstName} {student.middleName}{" "}
                          {student.lastName}
                        </td>
                        <td className="px-4 lg:px-6 py-4 border-b text-sm">
                          {student.enrollmentNo}
                        </td>
                        <td className="px-4 lg:px-6 py-4 border-b text-sm">
                          {student.class}
                        </td>
                        <td className="px-4 lg:px-6 py-4 border-b text-sm truncate max-w-xs">{student.email}</td>
                        <td className="px-4 lg:px-6 py-4 border-b text-center">
                          <div className="flex justify-center gap-1 sm:gap-2">
                            <CustomButton
                              variant="secondary"
                              className="!p-2"
                              onClick={() => editStudentHandler(student)}
                              title="Edit Student"
                            >
                              <MdEdit />
                            </CustomButton>
                            <CustomButton
                              variant="primary"
                              className="!p-2"
                              onClick={() => downloadReportCard(student)}
                              title="Download Report Card"
                            >
                              <FaFileDownload />
                            </CustomButton>
                            <CustomButton
                              variant="danger"
                              className="!p-2"
                              onClick={() => deleteStudentHandler(student._id)}
                              title="Delete Student"
                            >
                              <MdOutlineDelete />
                            </CustomButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {students.map((student) => (
                  <div key={student._id} className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={`${process.env.REACT_APP_MEDIA_LINK}/${student.profile}`}
                        alt={`${student.firstName}'s profile`}
                        className="w-16 h-16 object-cover rounded-full flex-shrink-0"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1744315900478-fa44dc6a4e89?q=80&w=3087&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {student.firstName} {student.middleName} {student.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">Enrollment: {student.enrollmentNo}</p>
                        <p className="text-sm text-gray-600">Class: {student.class}</p>
                        <p className="text-sm text-gray-600 truncate">Email: {student.email}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <CustomButton
                        variant="secondary"
                        className="!p-2"
                        onClick={() => editStudentHandler(student)}
                        title="Edit Student"
                      >
                        <MdEdit />
                      </CustomButton>
                      <CustomButton
                        variant="primary"
                        className="!p-2"
                        onClick={() => downloadReportCard(student)}
                        title="Download Report Card"
                      >
                        <FaFileDownload />
                      </CustomButton>
                      <CustomButton
                        variant="danger"
                        className="!p-2"
                        onClick={() => deleteStudentHandler(student._id)}
                        title="Delete Student"
                      >
                        <MdOutlineDelete />
                      </CustomButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={resetForm}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
            >
              <IoMdClose className="text-xl sm:text-2xl" />
            </button>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 pr-8">
              {isEditing ? "Edit Student" : "Add New Student"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addStudentHandler();
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleFormInputChange("firstName", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) =>
                      handleFormInputChange("middleName", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleFormInputChange("lastName", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      handleFormInputChange("phone", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class
                  </label>
                  <select
                    value={formData.class}
                    onChange={(e) =>
                      handleFormInputChange("class", e.target.value)
                    }
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      handleFormInputChange("gender", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      handleFormInputChange("dob", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) =>
                      handleFormInputChange("bloodGroup", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profile Photo
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept="image/*"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      handleFormInputChange("address", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      handleFormInputChange("city", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      handleFormInputChange("state", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) =>
                      handleFormInputChange("pincode", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      handleFormInputChange("country", e.target.value)
                    }
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyContact.name}
                        onChange={(e) =>
                          handleEmergencyContactChange("name", e.target.value)
                        }
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyContact.relationship}
                        onChange={(e) =>
                          handleEmergencyContactChange(
                            "relationship",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.emergencyContact.phone}
                        onChange={(e) =>
                          handleEmergencyContactChange("phone", e.target.value)
                        }
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="order-2 sm:order-1">
                  <p className="text-xs sm:text-sm">
                    Default login will be{" "}
                    <span className="font-bold break-all">
                      {formData.enrollmentNo || "enrollment_no"}@gmail.com
                    </span>{" "}
                    and password will be{" "}
                    <span className="font-bold">student123</span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 order-1 sm:order-2 w-full sm:w-auto">
                  <CustomButton
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton type="submit" variant="primary" className="w-full sm:w-auto">
                    {isEditing ? "Update Student" : "Add Student"}
                  </CustomButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirm
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this student?"
      />
    </div>
  );
};

export default Student;
