import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config/api.config";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";

function ResetPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/reset-request`, { email });
            setMessage("Password reset link sent. Redirecting to Login...");
            setDisabled(true);

            setTimeout(() => {
                navigate("/login");
            }, 10000);
        } catch (err) {
            setMessage(err.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const isSuccess = message.includes("Password reset link sent");
    const isError = message && !isSuccess;

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Left Side - StudAI Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="max-w-lg text-center">
                        <img
                            src="/StudAI_Logo-black.png"
                            alt="StudAI Logo"
                            className="w-70 h-70 mx-auto mb-8 drop-shadow-2xl"
                        />
                        <h2 className="text-gray-900 text-4xl font-bold leading-tight">
                            Forgot your<br />
                            password?<br />
                            Don't worry!
                        </h2>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-20 right-20">
                    <div className="w-12 h-12 bg-red-500 rounded-full opacity-80 animate-pulse"></div>
                </div>
                <div className="absolute top-40 right-40">
                    <div className="w-8 h-8 bg-red-400 rounded-full opacity-60 animate-bounce"></div>
                </div>
                <div className="absolute bottom-1/3 left-20">
                    <div className="w-6 h-20 bg-red-500 rounded-full transform rotate-12 opacity-90"></div>
                </div>
                <div className="absolute top-1/3 left-32">
                    <div className="w-10 h-10 bg-white/30 rounded-full opacity-70 animate-pulse"></div>
                </div>
                <div className="absolute top-1/4 right-1/3">
                    <div className="w-6 h-6 bg-red-300 rounded-full opacity-50"></div>
                </div>
                <div className="absolute bottom-1/4 left-1/4">
                    <div className="w-16 h-16 bg-white/20 rounded-lg transform rotate-45 opacity-60"></div>
                </div>

                {/* Paper/Study Elements */}
                <div className="absolute bottom-20 right-20 transform rotate-12 transition-transform hover:rotate-6 hover:scale-105">
                    <div className="w-40 h-48 bg-white rounded-lg shadow-2xl">
                        <div className="p-4 space-y-2">
                            <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-2 bg-gray-200 rounded w-full"></div>
                            <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-32 right-36 transform -rotate-6 transition-transform hover:rotate-0 hover:scale-105">
                    <div className="w-36 h-44 bg-red-500 rounded-lg shadow-2xl opacity-90">
                        <div className="p-3 space-y-2">
                            <div className="h-2 bg-white/40 rounded w-3/4"></div>
                            <div className="h-2 bg-white/40 rounded w-full"></div>
                            <div className="h-2 bg-white/40 rounded w-1/2"></div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-1/2 left-10 transform rotate-6 transition-transform hover:-rotate-3">
                    <div className="w-32 h-40 bg-white/90 rounded-lg shadow-xl">
                        <div className="p-3 space-y-2">
                            <div className="h-2 bg-yellow-200 rounded w-2/3"></div>
                            <div className="h-2 bg-yellow-200 rounded w-full"></div>
                            <div className="h-2 bg-yellow-200 rounded w-3/4"></div>
                        </div>
                    </div>
                </div>

                {/* Floating Icons */}
                <div className="absolute top-1/4 left-1/3 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3s' }}>
                    <div className="w-8 h-8 bg-white/40 rounded-full flex items-center justify-center text-yellow-600 font-bold text-lg shadow-lg">📚</div>
                </div>
                <div className="absolute bottom-1/3 right-1/4 animate-pulse" style={{ animationDuration: '2s' }}>
                    <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center text-red-600 font-bold text-xl shadow-lg">✏️</div>
                </div>
                <div className="absolute top-2/3 left-1/4 animate-bounce" style={{ animationDelay: '1s', animationDuration: '2.5s' }}>
                    <div className="w-7 h-7 bg-white/40 rounded-full flex items-center justify-center text-yellow-700 font-bold shadow-lg">💡</div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 bg-white flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="min-h-full flex items-center justify-center p-6 sm:p-8 lg:p-12">
                        <div className="w-full max-w-md py-4">
                            {/* Back Button */}
                            <button
                                onClick={() => navigate("/")}
                                className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                                <span className="font-medium">Back to Home</span>
                            </button>

                            {isSuccess ? (
                                // Success State
                                <div className="text-center">
                                    <div className="mb-6">
                                        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                            <CheckCircle className="w-12 h-12 text-green-600" />
                                        </div>
                                    </div>

                                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                        Check Your Email
                                    </h2>

                                    <p className="text-gray-600 mb-2">
                                        We've sent a password reset link to:
                                    </p>
                                    <p className="text-yellow-600 font-semibold text-lg mb-6">
                                        {email}
                                    </p>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                                        <p className="text-sm text-gray-700 mb-2">
                                            <strong>What's next?</strong>
                                        </p>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li>• Check your inbox (and spam folder)</li>
                                            <li>• Click the reset link in the email</li>
                                            <li>• Create your new password</li>
                                        </ul>
                                    </div>

                                    <p className="text-sm text-gray-500 mb-6">
                                        Redirecting to login in 10 seconds...
                                    </p>

                                    <NavLink
                                        to="/login"
                                        className="inline-block text-yellow-600 hover:text-yellow-700 font-semibold transition-colors"
                                    >
                                        Return to Login Now →
                                    </NavLink>
                                </div>
                            ) : (
                                // Form State
                                <>
                                    <div className="text-center mb-8">
                                        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                                            <Mail className="w-8 h-8 text-yellow-600" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                            Reset Your Password
                                        </h2>
                                        <p className="text-gray-600">
                                            Enter your email address and we'll send you a link to reset your password.
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="user@email.com"
                                                required
                                                disabled={disabled}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Error Message */}
                                        {isError && (
                                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-red-700">{message}</p>
                                            </div>
                                        )}

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={disabled || loading}
                                            className="w-full bg-black text-white py-3.5 rounded-lg font-semibold hover:bg-gray-800 active:scale-98 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
                                        >
                                            {loading ? "Sending Reset Link..." : "Send Reset Link"}
                                        </button>

                                        {/* Back to Login */}
                                        <div className="text-center pt-2">
                                            <span className="text-sm text-gray-600">Remember your password? </span>
                                            <NavLink
                                                to="/login"
                                                className="text-sm text-yellow-600 hover:text-yellow-700 font-semibold transition-colors"
                                            >
                                                Log in
                                            </NavLink>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ResetPassword;