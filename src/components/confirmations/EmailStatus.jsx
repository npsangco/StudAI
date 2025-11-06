import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function EmailStatus() {
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get("type");

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate("/login");
        }, 5000);
        return () => clearTimeout(timer);
    }, [navigate]);

    let title = "";
    let message = "";
    let subMessage = "Redirecting to login...";

    switch (type) {
        case "verified":
            title = "Email Verified!";
            message = "Your account has been activated. You can now log in.";
            break;
        case "already":
            title = "Email already verified.";
            message = "Your account has already been activated.";
            break;
        case "error":
            title = "Invalid or expired link.";
            message = "Please sign up again to receive a new verification email.";
            break;
        default:
            title = "Unknown Status";
            message = "Something went wrong.";
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white font-sans">
            <div className="bg-white text-gray-800 rounded-2xl shadow-xl p-8 text-center">
                <h2 className="text-3xl font-bold mb-4">{title}</h2>
                <p>{message}</p>
                <p className="mt-3 text-sm text-gray-600">{subMessage}</p>
            </div>
        </div>
    );
}
