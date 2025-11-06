import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./api";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function Signup() {
    const [month, setMonth] = useState("");
    const [day, setDay] = useState("");
    const [year, setYear] = useState("");

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();

    const months = [
        { name: "January", value: 1 }, { name: "February", value: 2 },
        { name: "March", value: 3 }, { name: "April", value: 4 },
        { name: "May", value: 5 }, { name: "June", value: 6 },
        { name: "July", value: 7 }, { name: "August", value: 8 },
        { name: "September", value: 9 }, { name: "October", value: 10 },
        { name: "November", value: 11 }, { name: "December", value: 12 },
    ];

    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

    const resetForm = () => {
        setMonth("");
        setDay("");
        setYear("");
        setEmail("");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (!passwordRegex.test(password)) {
            alert(
                "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
            );
            return;
        }

        if (!month || !day || !year) {
            alert("Please select a complete birthday!");
            return;
        }

        const birthday = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        try {
            const response = await axios.post(`${API_BASE}/api/auth/signup`, {
                email,
                username,
                password,
                birthday,
            }, {
                withCredentials: true,
                headers: { "Content-Type": "application/json" }
            });

            const successMessage =
                response.data?.message ||
                "Signup successful. Please check your email to verify your account.";

            alert(successMessage);
            resetForm();
            navigate("/login");
        } catch (err) {
            const errorMessage = err.response?.data?.error || "Signup failed";
            alert(errorMessage);
        }

    };

    const handleGoogleSignUp = () => {
        window.location.href = "http://localhost:4000/auth/google/";
    };

    return (
        <div className="h-screen flex overflow-hidden">
            {/* Left Side - StudAI Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="max-w-lg">
                        <h1 className="text-white text-6xl font-bold mb-6 drop-shadow-lg">StudAI</h1>
                        <h2 className="text-gray-900 text-4xl font-bold leading-tight">
                            Join the best<br />
                            study community<br />
                            today.
                        </h2>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-20 right-20">
                    <div className="w-12 h-12 bg-red-500 rounded-full opacity-80 animate-pulse"></div>
                </div>
                <div className="absolute top-40 right-40">
                    <div className="w-8 h-8 bg-red-400 rounded-full opacity-60"></div>
                </div>
                <div className="absolute bottom-1/3 left-20">
                    <div className="w-6 h-20 bg-red-500 rounded-full transform rotate-12 opacity-90"></div>
                </div>

                {/* Paper/Study Elements */}
                <div className="absolute bottom-20 right-20 transform rotate-12 transition-transform hover:rotate-6">
                    <div className="w-40 h-48 bg-white rounded-lg shadow-2xl"></div>
                </div>
                <div className="absolute bottom-32 right-36 transform -rotate-6 transition-transform hover:rotate-0">
                    <div className="w-36 h-44 bg-red-500 rounded-lg shadow-2xl opacity-90"></div>
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

                            {/* Tabs */}
                            <div className="flex mb-8 border-b border-gray-200">
                                <NavLink
                                    to="/signup"
                                    className={({ isActive }) =>
                                        `mr-8 pb-3 text-lg font-semibold transition-all relative ${isActive
                                            ? "text-black"
                                            : "text-gray-400 hover:text-gray-600"
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            Sign Up
                                            {isActive && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                                <NavLink
                                    to="/login"
                                    className={({ isActive }) =>
                                        `pb-3 text-lg font-semibold transition-all relative ${isActive
                                            ? "text-black"
                                            : "text-gray-400 hover:text-gray-600"
                                        }`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            Log in
                                            {isActive && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSignup} className="space-y-4">
                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="user@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                                    />
                                </div>

                                {/* Username */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Username <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="username123"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-1.5 text-xs text-gray-500">
                                        8+ characters with uppercase, lowercase, number & special character
                                    </p>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-5 h-5" />
                                            ) : (
                                                <Eye className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Birthday */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Birthday <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(e.target.value)}
                                            required
                                            className="px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all cursor-pointer"
                                        >
                                            <option value="">Month</option>
                                            {months.map((m) => (
                                                <option key={m.value} value={m.value}>
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={day}
                                            onChange={(e) => setDay(e.target.value)}
                                            required
                                            className="px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all cursor-pointer"
                                        >
                                            <option value="">Day</option>
                                            {days.map((d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            required
                                            className="px-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all cursor-pointer"
                                        >
                                            <option value="">Year</option>
                                            {years.map((y) => (
                                                <option key={y} value={y}>
                                                    {y}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Sign Up Button */}
                                <button
                                    type="submit"
                                    className="w-full bg-black text-white py-3.5 rounded-lg font-semibold hover:bg-gray-800 active:scale-98 transition-all duration-200 mt-6 shadow-sm hover:shadow-md"
                                >
                                    Create Account
                                </button>

                                {/* Login Link */}
                                <div className="text-center pt-2">
                                    <span className="text-sm text-gray-600">Already have an account? </span>
                                    <NavLink
                                        to="/login"
                                        className="text-sm text-yellow-600 hover:text-yellow-700 font-semibold transition-colors"
                                    >
                                        Log in
                                    </NavLink>
                                </div>

                                {/* Divider */}
                                <div className="relative my-5">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300" />
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-500 font-medium">or</span>
                                    </div>
                                </div>

                                {/* Google Button */}
                                <button
                                    type="button"
                                    onClick={handleGoogleSignUp}
                                    className="w-full flex items-center justify-center px-4 py-3.5 border-2 border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-400 active:scale-98 transition-all duration-200 shadow-sm hover:shadow-md group mb-4"
                                >
                                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">Continue with Google</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Signup;