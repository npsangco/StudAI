import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PasswordStatus({ type }) {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate(type === "success" ? "/dashboard" : "/login");
        }, 5000);
        return () => clearTimeout(timer);
    }, [navigate, type]);

    const isSuccess = type === "success";
    const title = isSuccess ? "Password Updated!" : "Invalid or Expired Link";
    const message = isSuccess
        ? "Your password has been successfully changed."
        : "Please request a new password reset link.";
    const redirectText = isSuccess
        ? "Redirecting to dashboard..."
        : "Redirecting to login...";
    const gradient = isSuccess
        ? "from-green-500 to-green-600"
        : "from-red-500 to-red-600";
    const iconPath = isSuccess
        ? "M5 13l4 4L19 7"
        : "M18 6L6 18M6 6l12 12";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-gray-800 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md text-center animate-fade-in">
                <div
                    className={`w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-8 h-8 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold mb-2">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="text-sm text-gray-500">{redirectText}</div>
            </div>
        </div>
    );
}
