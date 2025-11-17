import React, { useState, useEffect } from "react";
import { FiLogIn, FiMail, FiLock } from "react-icons/fi";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { setUserToken } from "../redux/actions";
import { useDispatch } from "react-redux";
import CustomButton from "../components/CustomButton";
import axiosWrapper from "../utils/AxiosWrapper";

const USER_TYPES = {
  STUDENT: "Student",
  FACULTY: "Faculty",
  ADMIN: "Admin",
};

const LoginForm = ({ selected, onSubmit, formData, setFormData }) => (
  <form
    className="w-full p-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20"
    onSubmit={onSubmit}
  >
    <div className="mb-6">
      <label
        className="block text-gray-700 text-sm font-semibold mb-3 tracking-wide"
        htmlFor="email"
      >
        {selected} Email
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FiMail className="text-gray-400" />
        </div>
        <input
          type="email"
          id="email"
          required
          placeholder="Enter your email address"
          className="w-full pl-11 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50/50"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
    </div>
    
    <div className="mb-6">
      <label
        className="block text-gray-700 text-sm font-semibold mb-3 tracking-wide"
        htmlFor="password"
      >
        Password
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FiLock className="text-gray-400" />
        </div>
        <input
          type="password"
          id="password"
          required
          placeholder="Enter your password"
          className="w-full pl-11 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50/50"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>
    </div>
    
    <div className="flex items-center justify-between mb-8">
      <Link
        className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline transition duration-200"
        to="/forget-password"
      >
        Forgot Password?
      </Link>
    </div>
    
    <CustomButton
      type="submit"
      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 px-6 rounded-xl transition duration-300 flex justify-center items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
    >
      Sign In
      <FiLogIn className="text-lg" />
    </CustomButton>
  </form>
);

const UserTypeSelector = ({ selected, onSelect }) => (
  <div className="flex justify-center gap-3 mb-10">
    {Object.values(USER_TYPES).map((type) => (
      <button
        key={type}
        onClick={() => onSelect(type)}
        className={`px-8 py-3 text-sm font-semibold rounded-xl transition-all duration-300 transform ${
          selected === type
            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105"
            : "bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md border border-gray-200/50"
        }`}
      >
        {type}
      </button>
    ))}
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [selected, setSelected] = useState(USER_TYPES.STUDENT);

  const handleUserTypeSelect = (type) => {
    const userType = type.toLowerCase();
    setSelected(type);
    setSearchParams({ type: userType });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const response = await axiosWrapper.post(
        `/${selected.toLowerCase()}/login`,
        formData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const { token } = response.data.data;
      localStorage.setItem("userToken", token);
      localStorage.setItem("userType", selected);
      dispatch(setUserToken(token));
      navigate(`/${selected.toLowerCase()}`);
    } catch (error) {
      toast.dismiss();
      console.error(error);
      toast.error(error.response?.data?.message || "Login failed");
    }
  };

  useEffect(() => {
    const userToken = localStorage.getItem("userToken");
    if (userToken) {
      navigate(`/${localStorage.getItem("userType").toLowerCase()}`);
    }
  }, [navigate]);

  useEffect(() => {
    if (type) {
      const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
      setSelected(capitalizedType);
    }
  }, [type]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full filter blur-3xl opacity-70 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/30 rounded-full filter blur-3xl opacity-70 translate-x-1/2 translate-y-1/2"></div>
      
      <div className="w-full max-w-2xl lg:w-1/2 px-6 py-12 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Welcome Back
          </h1>
          <p className="text-gray-600 text-lg">
            Sign in to your {selected.toLowerCase()} account
          </p>
        </div>
        
        <UserTypeSelector selected={selected} onSelect={handleUserTypeSelect} />
        
        <LoginForm
          selected={selected}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
        />
        
      </div>
      
      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: 'bg-white shadow-xl rounded-xl',
          duration: 3000,
        }}
      />
    </div>
  );
};

export default Login;