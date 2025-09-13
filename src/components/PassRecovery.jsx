import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function PassRecovery() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex min-h-screen">
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
        <div className="absolute top-16 right-16">
          <div className="w-8 h-8 bg-red-500 rounded-full opacity-80"></div>
        </div>
        <div className="absolute top-32 right-32">
          <div className="w-6 h-6 bg-red-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute bottom-1/3 left-16">
          <div className="w-4 h-16 bg-red-500 rounded-full transform rotate-12"></div>
        </div>
        <div className="absolute bottom-16 right-16 transform rotate-12">
          <div className="w-32 h-40 bg-white rounded-lg shadow-lg"></div>
        </div>
        <div className="absolute bottom-24 right-32 transform -rotate-6">
          <div className="w-28 h-36 bg-red-500 rounded-lg shadow-lg"></div>
        </div>
      </div>

      <div className="w-1/2 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-3">Password Recovery</h2>
          <p className="text-gray-600 mb-6">Enter your new password.</p>

          <form className="space-y-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="P@ssword123"
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="P@ssword123"
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-3 text-gray-500"
                >
                  {showConfirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-2"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PassRecovery;
