import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config/api.config";
import { Eye, EyeOff } from "lucide-react";

function PassRecovery() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Regex: Minimum 8 chars, at least one uppercase, one lowercase, one number, one special char
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      setMessage(
        "Password must be at least 8 characters, include uppercase, lowercase, number, and special character."
      );
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      // Check with backend if new password == old password
      const res = await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword: password,
      });

      if (res.data.error === "SameAsOld") {
        setMessage("New password cannot be the same as your old password");
        return;
      }

      setMessage("Password reset successful. Redirecting to login...");
      setIsDisabled(true);

      setTimeout(() => {
        navigate("/login");
      }, 5000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Something went wrong");
    }
  };


  return (
    <div className="flex min-h-screen">
      {/* LEFT SIDE */}
      <div className="w-1/2 bg-gradient-to-br from-yellow-400 to-yellow-500 relative overflow-hidden">
        <div className="absolute inset-0 p-12 flex flex-col justify-center">
          <h1 className="text-white text-4xl font-bold mb-8">StudAI</h1>
          <h2 className="text-gray-800 text-3xl font-bold leading-tight">
            Secure your<br />
            account with a<br />
            strong new<br />
            password.
          </h2>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-3">Password Recovery</h2>
          <p className="text-gray-600 mb-6">Enter your new password.</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="P@ssword123"
                  required
                  disabled={isDisabled}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-0 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isDisabled}
                  className="absolute right-3 top-3 text-gray-500 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="P@ssword123"
                  required
                  disabled={isDisabled}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-0 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  disabled={isDisabled}
                  className="absolute right-3 top-3 text-gray-500 disabled:cursor-not-allowed"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-2 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </form>

          {message && (
            <p className="mt-4 text-sm text-gray-700">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PassRecovery;
