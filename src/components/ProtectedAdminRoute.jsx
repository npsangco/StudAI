import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config/api.config";

export default function ProtectedAdminRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/auth/check-admin`, {
                    withCredentials: true,
                });

                setIsAdmin(res.data.isAdmin);
                setAuthenticated(res.data.authenticated);
            } catch (err) {
                console.error("Admin check failed:", err);
                setIsAdmin(false);
                setAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Access Denied
                    </h2>
                    <p className="text-gray-600 mb-6">
                        You don't have permission to access this page. Administrator privileges are required.
                    </p>
                    <button
                        onClick={() => window.location.href = "/dashboard"}
                        className="bg-yellow-400 text-black font-semibold px-6 py-2 rounded-lg hover:bg-yellow-500 transition"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return children;
}