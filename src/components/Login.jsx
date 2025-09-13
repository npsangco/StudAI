import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./api";
import { Eye, EyeOff } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      alert("Logged in!");
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.error || "Login failed");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:4000/auth/google/";
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - StudAI Branding */}
      <div className="w-1/2 bg-gradient-to-br from-yellow-400 to-yellow-500 relative overflow-hidden">
        <div className="absolute inset-0 p-12 flex flex-col justify-center">
          <h1 className="text-white text-4xl font-bold mb-8">StudAI</h1>
          <h2 className="text-gray-800 text-3xl font-bold leading-tight">
            The best way<br />
            to study is<br />
            with your<br />
            buddy.
          </h2>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-16 right-16">
          <div className="w-8 h-8 bg-red-500 rounded-full opacity-80"></div>
        </div>
        <div className="absolute top-32 right-32">
          <div className="w-6 h-6 bg-red-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute bottom-1/3 left-16">
          <div className="w-4 h-16 bg-red-500 rounded-full transform rotate-12"></div>
        </div>

        {/* Paper/Study Elements */}
        <div className="absolute bottom-16 right-16 transform rotate-12">
          <div className="w-32 h-40 bg-white rounded-lg shadow-lg"></div>
        </div>
        <div className="absolute bottom-24 right-32 transform -rotate-6">
          <div className="w-28 h-36 bg-red-500 rounded-lg shadow-lg"></div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Tabs */}
          <div className="flex mb-8">
            <NavLink
              to="/signup"
              className={({ isActive }) =>
                `mr-6 pb-2 text-lg font-medium ${
                  isActive
                    ? "text-black border-b-2 border-black"
                    : "text-gray-400"
                }`
              }
            >
              Sign Up
            </NavLink>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `pb-2 text-lg font-medium ${
                  isActive
                    ? "text-black border-b-2 border-black"
                    : "text-gray-400"
                }`
              }
            >
              Log in
            </NavLink>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-0"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <NavLink
                to="/resetpassword"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot Password?
              </NavLink>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200"
            >
              Log in
            </button>

            {/* Sign Up Link */}
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition duration-200"
            >
              New to StudAI? Create an Account
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">or</span>
              </div>
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition duration-200"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
