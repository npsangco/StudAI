import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./api";
import { API_URL } from "../config/api.config";
import { Eye, EyeOff, ArrowLeft, Loader2, Clock } from "lucide-react";
import ToastContainer from "./ToastContainer";
import { useToast } from "../hooks/useToast";
import { 
    validateEmail, 
    validateUsername, 
    validatePassword, 
    validateConfirmPassword, 
    validateBirthday,
    validateTermsAcceptance 
} from "../utils/validation";

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
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
    const [verificationCheckInterval, setVerificationCheckInterval] = useState(null);

    const navigate = useNavigate();
    
    const { toasts, removeToast, toast } = useToast();

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
        setAcceptedTerms(false);
    };

    // Check verification status periodically
    const checkVerificationStatus = async (emailToCheck) => {
        try {
            const response = await axios.get(`${API_BASE}/api/auth/check-verification`, {
                params: { email: emailToCheck }
            });

            if (response.data?.verified) {
                // Clear intervals
                if (verificationCheckInterval) {
                    clearInterval(verificationCheckInterval);
                }
                
                toast.success("Email verified! Redirecting to login...");
                setTimeout(() => {
                    navigate("/login");
                }, 1500);
            }
        } catch (err) {
            console.error("Error checking verification:", err);
        }
    };

    // Timer countdown effect
    useEffect(() => {
        if (isAwaitingVerification && timeRemaining > 0) {
            const timer = setTimeout(() => {
                setTimeRemaining(timeRemaining - 1);
            }, 1000);

            return () => clearTimeout(timer);
        } else if (isAwaitingVerification && timeRemaining === 0) {
            // Time expired
            if (verificationCheckInterval) {
                clearInterval(verificationCheckInterval);
            }
            toast.error("Verification time expired. Please sign up again.");
            setIsAwaitingVerification(false);
            setTimeRemaining(300);
        }
    }, [isAwaitingVerification, timeRemaining, verificationCheckInterval]);

    // Start verification check interval
    useEffect(() => {
        if (isAwaitingVerification && userEmail) {
            const interval = setInterval(() => {
                checkVerificationStatus(userEmail);
            }, 3000); // Check every 3 seconds

            setVerificationCheckInterval(interval);

            return () => {
                if (interval) {
                    clearInterval(interval);
                }
            };
        }
    }, [isAwaitingVerification, userEmail]);

    const handleSignup = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            toast.error(emailValidation.error);
            return;
        }

        // Validate username
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.isValid) {
            toast.error(usernameValidation.error);
            return;
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            toast.error(passwordValidation.error);
            return;
        }

        // Validate confirm password
        const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);
        if (!confirmPasswordValidation.isValid) {
            toast.error(confirmPasswordValidation.error);
            return;
        }

        // Validate birthday
        const birthdayValidation = validateBirthday(month, day, year);
        if (!birthdayValidation.isValid) {
            toast.error(birthdayValidation.error);
            return;
        }

        // Validate terms acceptance
        const termsValidation = validateTermsAcceptance(acceptedTerms);
        if (!termsValidation.isValid) {
            toast.error(termsValidation.error);
            return;
        }

        const birthday = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        setIsSubmitting(true);

        try {
            const response = await axios.post(`${API_BASE}/api/auth/signup`, {
                email: email.trim(),
                username: username.trim(),
                password,
                birthday,
                acceptedTerms: true
            }, {
                withCredentials: true,
                headers: { "Content-Type": "application/json" }
            });

            const successMessage =
                response.data?.message ||
                "Signup successful. Please check your email to verify your account.";

            setUserEmail(email.trim());
            setIsAwaitingVerification(true);
            setTimeRemaining(300); // Reset to 5 minutes
        } catch (err) {
            const errorMessage = err.response?.data?.error || "Signup failed. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }

    };

    const handleGoogleSignUp = () => {
        window.location.href = `${API_URL}/auth/google/`;
    };

    // Format time remaining
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // If awaiting verification, show loading screen instead of form
    if (isAwaitingVerification) {
        return (
            <div className="h-screen flex overflow-hidden">
                <ToastContainer toasts={toasts} onDismiss={removeToast} />
                
                {/* Left Side - StudAI Branding (same as signup) */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center p-12">
                        <div className="max-w-lg text-center">
                            <img 
                              src="/StudAI_Logo-black.png" 
                              alt="StudAI Logo" 
                              className="w-70 h-70 mx-auto mb-8 drop-shadow-2xl"
                            />
                            <h2 className="text-gray-900 text-4xl font-bold leading-tight">
                                Almost there!<br />
                                Verify your email<br />
                                to get started.
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
                    <div className="absolute top-1/4 left-1/3 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3s'}}>
                        <div className="w-8 h-8 bg-white/40 rounded-full flex items-center justify-center text-yellow-600 font-bold text-lg shadow-lg">📚</div>
                    </div>
                    <div className="absolute bottom-1/3 right-1/4 animate-pulse" style={{animationDuration: '2s'}}>
                        <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center text-red-600 font-bold text-xl shadow-lg">✏️</div>
                    </div>
                    <div className="absolute top-2/3 left-1/4 animate-bounce" style={{animationDelay: '1s', animationDuration: '2.5s'}}>
                        <div className="w-7 h-7 bg-white/40 rounded-full flex items-center justify-center text-yellow-700 font-bold shadow-lg">💡</div>
                    </div>
                </div>

                {/* Right Side - Verification Waiting */}
                <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 sm:p-8 lg:p-12">
                    <div className="w-full max-w-md text-center">
                        {/* Animated Loading Icon */}
                        <div className="mb-8">
                            <div className="relative mx-auto w-24 h-24">
                                <Loader2 className="w-24 h-24 text-yellow-500 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-yellow-100 rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Waiting for Verification
                        </h2>

                        {/* Email */}
                        <p className="text-gray-600 mb-2">
                            Verification email sent to:
                        </p>
                        <p className="text-yellow-600 font-semibold text-lg mb-8">
                            {userEmail}
                        </p>

                        {/* Instructions */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-left">
                            <p className="text-sm font-semibold text-gray-900 mb-3">
                                📧 Check your email and click the verification link
                            </p>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li>• Check your inbox and spam folder</li>
                                <li>• Click the verification link in the email</li>
                                <li>• You'll be automatically redirected to login</li>
                            </ul>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <Clock className="w-5 h-5 text-gray-500" />
                            <span className="text-gray-600">
                                Time remaining: <span className="font-mono font-bold text-yellow-600">{formatTime(timeRemaining)}</span>
                            </span>
                        </div>

                        {/* Status */}
                        <p className="text-sm text-gray-500 mb-8 flex items-center justify-center gap-2">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Checking verification status...
                        </p>

                        {/* Cancel Button */}
                        <button
                            onClick={() => {
                                if (verificationCheckInterval) {
                                    clearInterval(verificationCheckInterval);
                                }
                                setIsAwaitingVerification(false);
                                setTimeRemaining(300);
                                toast.info("Verification cancelled");
                            }}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                        >
                            Cancel and return to sign up
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden">
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
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
                <div className="absolute top-1/4 left-1/3 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3s'}}>
                    <div className="w-8 h-8 bg-white/40 rounded-full flex items-center justify-center text-yellow-600 font-bold text-lg shadow-lg">📚</div>
                </div>
                <div className="absolute bottom-1/3 right-1/4 animate-pulse" style={{animationDuration: '2s'}}>
                    <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center text-red-600 font-bold text-xl shadow-lg">✏️</div>
                </div>
                <div className="absolute top-2/3 left-1/4 animate-bounce" style={{animationDelay: '1s', animationDuration: '2.5s'}}>
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

                                {/* Terms and Conditions Checkbox */}
                                <div className="pt-2">
                                    <label className="flex items-start cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            className="mt-1 w-4 h-4 text-yellow-600 bg-gray-50 border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                                        />
                                        <span className="ml-3 text-sm text-gray-700 leading-relaxed">
                                            I agree to the{" "}
                                            <button
                                                type="button"
                                                onClick={() => setShowTermsModal(true)}
                                                className="text-yellow-600 hover:text-yellow-700 font-semibold underline"
                                            >
                                                Terms and Conditions
                                            </button>
                                            {" "}and{" "}
                                            <button
                                                type="button"
                                                onClick={() => setShowPrivacyModal(true)}
                                                className="text-yellow-600 hover:text-yellow-700 font-semibold underline"
                                            >
                                                Privacy Policy
                                            </button>
                                        </span>
                                    </label>
                                </div>

                                {/* Sign Up Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-black text-white py-3.5 rounded-lg font-semibold hover:bg-gray-800 active:scale-98 transition-all duration-200 mt-6 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
                                >
                                    {isSubmitting ? "Creating Account..." : "Create Account"}
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

            {/* Terms and Conditions Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="bg-yellow-400 px-6 py-4 flex items-center justify-between flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">Terms and Conditions</h2>
                            <button
                                onClick={() => setShowTermsModal(false)}
                                className="text-gray-700 hover:text-gray-900 transition-colors text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="text-sm text-gray-700 space-y-6">
                                <p className="text-gray-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
                                <p>
                                    Welcome to StudAI. These Terms and Conditions govern your use of our website, and related services.
                                    By accessing, or using the Service, you agree to be bound by these Terms. If you do not agree, please do not use our Service.
                                </p>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">1. Eligibility</h3>
                                    <p>
                                        You must be at least 18 years old and a student of the University of Santo Tomas - College of Information and Computing Sciences to use this Service. By using the Service, you represent that you meet this age requirement and have the legal capacity to agree to these Terms.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">2. Account Registration</h3>
                                    <p className="mb-2">
                                        To access certain features, you may need to create an account.
                                        You agree to:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li>Provide accurate, complete, and current information.</li>
                                        <li>Keep your login credentials confidential.</li>
                                        <li>Notify us immediately of any unauthorized access to your account.</li>
                                    </ul>
                                    <p className="mt-2">
                                        We are not responsible for any loss or damage arising from your failure to safeguard your account credentials.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">3. Use of the Service</h3>
                                    <p className="mb-2">
                                        You agree to use the Service only for lawful purposes and in accordance with these Terms.
                                        You must not:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li>Violate any applicable laws or regulations.</li>
                                        <li>Use the Service to transmit spam, malware, or harmful content.</li>
                                        <li>Attempt to hack, reverse-engineer, or disrupt the Service's operation.</li>
                                    </ul>
                                    <p className="mt-2">
                                        We reserve the right to suspend or terminate your access if we believe you have violated these Terms.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">4. Intellectual Property</h3>
                                    <p className="mb-2">
                                        All content, trademarks, logos, and software related to the Service are owned by or licensed to StudAI.
                                        You are granted a limited, non-exclusive, non-transferable license to use the Service for personal or internal business use only.
                                    </p>
                                    <p>
                                        You may not copy, modify, or distribute any part of the Service without prior written consent from us.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">5. Termination</h3>
                                    <p>
                                        We may suspend or terminate your account at any time, with or without notice, if you violate these Terms or for any other reason at our discretion.
                                        You may terminate your account by deleting it or contacting us at [support email].
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">6. Disclaimer of Warranties</h3>
                                    <p>
                                        The Service is provided "as is" and "as available" without any warranties, express or implied.
                                        We do not guarantee that the Service will be uninterrupted, error-free, or secure.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">7. Limitation of Liability</h3>
                                    <p>
                                        To the maximum extent permitted by law, StudAI and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">8. Privacy</h3>
                                    <p>
                                        Your use of the Service is also governed by our Privacy Policy, which explains how we collect, use, and protect your information.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">9. Changes to These Terms</h3>
                                    <p>
                                        We may update these Terms from time to time.
                                        We will notify users of material changes by posting the new Terms on this page with an updated date.
                                        Continued use of the Service after changes means you accept the revised Terms.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">10. Governing Law</h3>
                                    <p>
                                        These Terms are governed by the laws of the Philippines, without regard to its conflict of laws principles.
                                        Any disputes shall be resolved in the courts located in the Philippines.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">11. Contact Us</h3>
                                    <p>
                                        If you have any questions or concerns about these Terms, please contact us at:
                                    </p>
                                    <ul className="list-none space-y-1 mt-2">
                                        <li>[support email]</li>
                                        <li>[Company name and address]</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 px-6 py-4 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setShowTermsModal(false)}
                                className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Privacy Policy Modal */}
            {showPrivacyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="bg-yellow-400 px-6 py-4 flex items-center justify-between flex-shrink-0">
                            <h2 className="text-xl font-bold text-gray-900">Privacy Policy</h2>
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="text-gray-700 hover:text-gray-900 transition-colors text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="text-sm text-gray-700 space-y-6">
                                <p className="text-gray-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
                                <p>
                                    Welcome to StudAI. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
                                    Please read this policy carefully. If you do not agree with the terms, please do not access the Service.
                                </p>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">1. Information We Collect</h3>
                                    <p className="mb-2">We may collect the following types of information:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li><strong>Personal Information:</strong> Name, email address, username, birthday, and profile information.</li>
                                        <li><strong>Usage Data:</strong> Information about how you use the Service, including activity logs, study sessions, and interactions.</li>
                                        <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">2. How We Use Your Information</h3>
                                    <p className="mb-2">We use the collected information for the following purposes:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li>To provide, maintain, and improve the Service.</li>
                                        <li>To personalize your experience and deliver relevant content.</li>
                                        <li>To communicate with you about updates, security alerts, and support.</li>
                                        <li>To monitor usage patterns and analyze trends to enhance functionality.</li>
                                        <li>To comply with legal obligations and enforce our Terms and Conditions.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">3. Sharing Your Information</h3>
                                    <p className="mb-2">We do not sell your personal information. We may share your information in the following circumstances:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li><strong>Service Providers:</strong> Third-party vendors who assist in operating the Service (e.g., hosting, analytics).</li>
                                        <li><strong>Legal Requirements:</strong> When required by law or to protect our rights, safety, or property.</li>
                                        <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">4. Data Security</h3>
                                    <p>
                                        We implement reasonable security measures to protect your information from unauthorized access, alteration, disclosure, or destruction.
                                        However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">5. Your Rights</h3>
                                    <p className="mb-2">You have the following rights regarding your personal information:</p>
                                    <ul className="list-disc list-inside space-y-1 ml-4">
                                        <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
                                        <li><strong>Correction:</strong> Request corrections to inaccurate or incomplete information.</li>
                                        <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal obligations.</li>
                                        <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">6. Cookies and Tracking Technologies</h3>
                                    <p>
                                        We use cookies and similar technologies to track activity on our Service and store certain information.
                                        You can manage your cookie preferences through your browser settings, but disabling cookies may affect functionality.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">7. Third-Party Links</h3>
                                    <p>
                                        Our Service may contain links to third-party websites or services that are not operated by us.
                                        We are not responsible for the privacy practices of these third parties, and we encourage you to review their privacy policies.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">8. Children's Privacy</h3>
                                    <p>
                                        Our Service is not intended for users under the age of 18. We do not knowingly collect personal information from children.
                                        If we become aware that we have collected information from a child, we will take steps to delete such information.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">9. Changes to This Privacy Policy</h3>
                                    <p>
                                        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated date.
                                        Your continued use of the Service after changes means you accept the revised policy.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-2">10. Contact Us</h3>
                                    <p>
                                        If you have any questions or concerns about this Privacy Policy, please contact us at:
                                    </p>
                                    <ul className="list-none space-y-1 mt-2">
                                        <li>[support email]</li>
                                        <li>[Company name and address]</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 px-6 py-4 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setShowPrivacyModal(false)}
                                className="bg-gray-900 text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Signup;