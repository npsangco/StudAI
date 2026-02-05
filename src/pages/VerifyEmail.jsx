import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../components/api";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [status, setStatus] = useState("idle"); // idle, loading, success, error
    const [message, setMessage] = useState("");

    const handleVerify = async () => {
        if (!token) {
            setStatus("error");
            setMessage("Invalid verification link.");
            return;
        }

        setStatus("loading");

        try {
            const response = await axios.post(`${API_BASE}/api/auth/confirm-verification`, {
                token
            });

            setStatus("success");
            setMessage("Email verified successfully!");

            // Store auth token if provided
            if (response.data?.authToken) {
                localStorage.setItem("authToken", response.data.authToken);
            }

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                navigate("/dashboard");
            }, 2000);

        } catch (err) {
            setStatus("error");
            const errorMsg = err.response?.data?.error || "Verification failed. Please try again or sign up again.";
            setMessage(errorMsg);

            // Redirect to login after 5 seconds
            setTimeout(() => {
                navigate("/login");
            }, 5000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                {/* Logo */}
                <img
                    src="/StudAI_Logo-black.png"
                    alt="StudAI Logo"
                    className="w-24 h-24 mx-auto mb-6"
                />

                {status === "idle" && (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Verify Your Email
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Click the button below to verify your email address and activate your account.
                        </p>
                        <button
                            onClick={handleVerify}
                            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                        >
                            Verify My Email
                        </button>
                    </>
                )}

                {status === "loading" && (
                    <>
                        <Loader2 className="w-16 h-16 text-yellow-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Verifying...
                        </h2>
                        <p className="text-gray-600">
                            Please wait while we verify your email.
                        </p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Email Verified!
                        </h2>
                        <p className="text-gray-600">
                            {message}
                        </p>
                        <p className="text-sm text-gray-500 mt-4">
                            Redirecting to dashboard...
                        </p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Verification Failed
                        </h2>
                        <p className="text-gray-600">
                            {message}
                        </p>
                        <p className="text-sm text-gray-500 mt-4">
                            Redirecting to login...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
